import os
import cv2
import numpy as np
from typing import List
from tqdm import tqdm

# from .ballon_extractor import extract_ballon_region
from . import text_render
from .text_render_eng import render_textblock_list_eng
from .text_render_pillow_eng import render_textblock_list_eng as render_textblock_list_eng_pillow
from ..utils import (
    BASE_PATH,
    TextBlock,
    color_difference,
    get_logger,
)

logger = get_logger('render')

def parse_font_paths(path: str, default: List[str] = None) -> List[str]:
    if path:
        parsed = path.split(',')
        parsed = list(filter(lambda p: os.path.isfile(p), parsed))
    else:
        parsed = default or []
    return parsed

def fg_bg_compare(fg, bg):
    fg_avg = np.mean(fg)
    if color_difference(fg, bg) < 30:
        bg = (255, 255, 255) if fg_avg <= 127 else (0, 0, 0)
    return fg, bg

def _bbox_wh_from_polygon(dst_points: np.ndarray) -> tuple[int, int]:
    """
    Derive (width, height) of the (possibly rotated) quadrilateral dst_points.
    Width  = average of edges 0–1 and 2–3 (the "horizontal" sides).
    Height = average of edges 1–2 and 3–0 (the "vertical" sides).
    """
    pts = np.asarray(dst_points, dtype=np.float32).reshape(4, 2)
    e = [float(np.linalg.norm(pts[(i + 1) % 4] - pts[i])) for i in range(4)]
    w = max(1, int(round((e[0] + e[2]) * 0.5)))
    h = max(1, int(round((e[1] + e[3]) * 0.5)))
    return w, h


def _fit_font_size_to_dims(
    region,
    max_w: int,
    max_h: int,
    max_font_size: int,
    min_font_size: int,
    line_spacing_ratio: float = 0.01,
) -> int:
    """
    Binary-search the largest font size in [min_font_size, max_font_size]
    such that the wrapped *translation* (region.translation) fits inside
    a rectangle of (max_w, max_h). Falls back to min_font_size if even that
    doesn't fit (text overflow is preferable to invisibly tiny text).

    This is the source-of-truth fit logic: it uses the exact same
    `calc_horizontal` / `calc_vertical` functions that `put_text_horizontal`
    / `put_text_vertical` call internally, and evaluates against the
    *Vietnamese* translation — not the original CN/JA source. That is what
    makes it robust to "translation is much longer than source" cases.
    """
    translation = (region.translation or "").strip()
    if not translation or max_font_size <= min_font_size:
        return max(1, min_font_size)

    lang = getattr(region, "target_lang", "en_US")

    def fits(fs: int) -> bool:
        if fs <= 0:
            return False
        if region.horizontal:
            lines, widths = text_render.calc_horizontal(
                fs, translation, max_width=max_w, max_height=max_h, language=lang
            )
            if not lines:
                return True
            n = len(lines)
            spacing_y = max(1, int(fs * line_spacing_ratio))
            text_w = max(widths) if widths else 0
            text_h = n * fs + spacing_y * max(0, n - 1)
            return text_w <= max_w and text_h <= max_h
        # vertical
        cols, _ = text_render.calc_vertical(fs, translation, max_height=max_h)
        if not cols:
            return True
        n = len(cols)
        text_w = n * fs + max(1, int(fs * line_spacing_ratio)) * max(0, n - 1)
        return text_w <= max_w

    lo, hi = max(1, min_font_size), int(max_font_size)
    best = lo
    while lo <= hi:
        mid = (lo + hi) // 2
        try:
            ok = fits(mid)
        except Exception:
            ok = False
        if ok:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return best


def _fit_font_size_to_bbox(
    region,
    dst_points: np.ndarray,
    max_font_size: int,
    min_font_size: int,
    line_spacing_ratio: float = 0.01,
) -> int:
    """Polygon-based wrapper around `_fit_font_size_to_dims`."""
    max_w, max_h = _bbox_wh_from_polygon(dst_points)
    return _fit_font_size_to_dims(
        region, max_w, max_h, max_font_size, min_font_size, line_spacing_ratio
    )

def resize_regions_to_font_size(img: np.ndarray, text_regions: List['TextBlock'], font_size_fixed: int, font_size_offset: int, font_size_minimum: int):  
    """
    Adjust text region size to accommodate font size and translated text length.
    
    Args:  
        img: Input image
        text_regions: List of text regions to process
        font_size_fixed: Fixed font size (overrides other font parameters)
        font_size_offset: Font size offset
        font_size_minimum: Minimum font size (-1 for auto-calculation)

    Returns:  
        List of adjusted text region bounding boxes
    """    
    
    # Define minimum font size
    if font_size_minimum == -1:  
        font_size_minimum = round((img.shape[0] + img.shape[1]) / 200)  
    # logger.debug(f'font_size_minimum {font_size_minimum}')  
    font_size_minimum = max(1, font_size_minimum)  

    dst_points_list = []  
    for region in text_regions: 
    
        # Store and validate original font size
        original_region_font_size = region.font_size  
        if original_region_font_size <= 0:  
            # logger.warning(f"Invalid original font size ({original_region_font_size}) for text '{region.translation}'. Using default value {font_size_minimum}.")  
            original_region_font_size = font_size_minimum

        # Determine target font size
        current_base_font_size = original_region_font_size  
        if font_size_fixed is not None:  
            target_font_size = font_size_fixed  
        else:  
            target_font_size = current_base_font_size + font_size_offset  

        target_font_size = max(target_font_size, font_size_minimum, 1)

        # JA/CN → VI: bubbles are sized for the source text, and YOLO bbox ≈ source
        # text region ≈ bubble interior. Expanding dst_points to fit longer VI text
        # (as the upstream pipeline did, for ~equal-length CN/JA → EN) pushes the
        # rendered text outside the speech bubble. Pin dst_points to the YOLO bbox
        # and let the binary-search shrink-to-fit below pick the largest font that
        # stays inside. If text still doesn't fit at font_size_minimum, it overflows
        # — the upstream LLM prompt should produce shorter VI in that case.
        dst_points = region.min_rect

        # Shrink-to-fit: derive the true max font size that keeps the wrapped
        # translation inside the YOLO bbox. Without this, JA/CN→VI text
        # (≈2–3× longer than source) overflows the bubble.
        if dst_points is not None:
            fitted_font_size = _fit_font_size_to_bbox(
                region,
                dst_points,
                max_font_size=int(target_font_size),
                min_font_size=int(font_size_minimum),
            )
            target_font_size = fitted_font_size

        # Store results and update font size
        dst_points_list.append(dst_points)
        region.font_size = int(target_font_size)

    return dst_points_list

async def dispatch(
    img: np.ndarray,
    text_regions: List[TextBlock],
    font_path: str = '',
    font_size_fixed: int = None,
    font_size_offset: int = 0,
    font_size_minimum: int = 0,
    hyphenate: bool = True,
    render_mask: np.ndarray = None,
    line_spacing: int = None,
    disable_font_border: bool = False
    ) -> np.ndarray:

    text_render.set_font(font_path)
    text_regions = list(filter(lambda region: region.translation, text_regions))

    # Resize regions that are too small
    dst_points_list = resize_regions_to_font_size(img, text_regions, font_size_fixed, font_size_offset, font_size_minimum)

    # TODO: Maybe remove intersections

    # Render text
    for region, dst_points in tqdm(zip(text_regions, dst_points_list), '[render]', total=len(text_regions)):
        if render_mask is not None:
            # set render_mask to 1 for the region that is inside dst_points
            cv2.fillConvexPoly(render_mask, dst_points.astype(np.int32), 1)
        img = render(img, region, dst_points, hyphenate, line_spacing, disable_font_border)
    return img

def render(
    img,
    region: TextBlock,
    dst_points,
    hyphenate,
    line_spacing,
    disable_font_border
):
    fg, bg = region.get_font_colors()
    fg, bg = fg_bg_compare(fg, bg)

    if disable_font_border :
        bg = None

    middle_pts = (dst_points[:, [1, 2, 3, 0]] + dst_points) / 2
    norm_h = np.linalg.norm(middle_pts[:, 1] - middle_pts[:, 3], axis=1)
    norm_v = np.linalg.norm(middle_pts[:, 2] - middle_pts[:, 0], axis=1)
    r_orig = np.mean(norm_h / norm_v)

    # If configuration is set to non-automatic mode, use configuration to determine direction directly
    forced_direction = region._direction if hasattr(region, "_direction") else region.direction
    if forced_direction != "auto":
        if forced_direction in ["horizontal", "h"]:
            render_horizontally = True
        elif forced_direction in ["vertical", "v"]:
            render_horizontally = False
        else:
            render_horizontally = region.horizontal
    else:
        render_horizontally = region.horizontal

    #print(f"Region text: {region.text}, forced_direction: {forced_direction}, render_horizontally: {render_horizontally}")

    # Draw-time fit: the *Vietnamese* translation is typically 2–3× longer than
    # the original CN/JA. The pre-computed `region.font_size` may still be too
    # big for the actual draw bbox, so binary-search down here using the exact
    # (max_w, max_h) that put_text_horizontal/_vertical is about to receive.
    draw_w = round(norm_h[0])
    draw_h = round(norm_v[0])
    img_h, img_w = img.shape[:2]
    min_fs = max(8, round((img_h + img_w) / 400))
    region.font_size = _fit_font_size_to_dims(
        region,
        max_w=draw_w,
        max_h=draw_h,
        max_font_size=int(region.font_size),
        min_font_size=min_fs,
        line_spacing_ratio=float(line_spacing) if line_spacing else 0.01,
    )

    if render_horizontally:
        temp_box = text_render.put_text_horizontal(
            region.font_size,
            region.get_translation_for_rendering(),
            draw_w,
            draw_h,
            region.alignment,
            region.direction == 'hl',
            fg,
            bg,
            region.target_lang,
            hyphenate,
            line_spacing,
        )
    else:
        temp_box = text_render.put_text_vertical(
            region.font_size,
            region.get_translation_for_rendering(),
            round(norm_v[0]),
            region.alignment,
            fg,
            bg,
            line_spacing,
        )
    h, w, _ = temp_box.shape
    r_temp = w / h

    # Extend temporary box so that it has same ratio as original
    box = None  
    #print("\n" + "="*50)  
    #print(f"Processing text: \"{region.get_translation_for_rendering()}\"")  
    #print(f"Text direction: {'Horizontal' if region.horizontal else 'Vertical'}")  
    #print(f"Font size: {region.font_size}, Alignment: {region.alignment}")  
    #print(f"Target language: {region.target_lang}")      
    #print(f"Region horizontal: {region.horizontal}")  
    #print(f"Starting image adjustment: r_temp={r_temp}, r_orig={r_orig}, h={h}, w={w}")  
    if region.horizontal:  
        #print("Processing HORIZONTAL region")  
        
        if r_temp > r_orig:   
            #print(f"Case: r_temp({r_temp}) > r_orig({r_orig}) - Need vertical padding")  
            h_ext = int((w / r_orig - h) // 2) if r_orig > 0 else 0  
            #print(f"Calculated h_ext = {h_ext}")  
            
            if h_ext >= 0:  
                #print(f"Creating new box with dimensions: {h + h_ext * 2}x{w}")  
                box = np.zeros((h + h_ext * 2, w, 4), dtype=np.uint8)  
                #print(f"Placing temp_box at position [h_ext:h_ext+h, :w] = [{h_ext}:{h_ext+h}, 0:{w}]")  
                # Columns fully filled, rows centered
                box[h_ext:h_ext+h, 0:w] = temp_box  
            else:  
                #print("h_ext < 0, using original temp_box")  
                box = temp_box.copy()  
        else:   
            #print(f"Case: r_temp({r_temp}) <= r_orig({r_orig}) - Need horizontal padding")  
            w_ext = int((h * r_orig - w) // 2)  
            #print(f"Calculated w_ext = {w_ext}")  
            
            if w_ext >= 0:  
                #print(f"Creating new box with dimensions: {h}x{w + w_ext * 2}")  
                box = np.zeros((h, w + w_ext * 2, 4), dtype=np.uint8)  
                #print(f"Placing temp_box at position [:, :w] = [0:{h}, 0:{w}]")  
         
                # The line is full, and there should be no empty columns on the left side of the text. Otherwise, when multiple text boxes are aligned on the left, the translated text cannot be aligned. Common scenarios: borderless comics, comic postscript.  
                # When there are bubbles on the current page, it can be changed to center: box[0:h, w_ext:w_ext+w] = temp_box, requiring more accurate bubble detection. But not changing it doesn't have much impact.
                box[0:h, 0:w] = temp_box  
            else:  
                #print("w_ext < 0, using original temp_box")  
                box = temp_box.copy()  
    else:  
        #print("Processing VERTICAL region")  
        
        if r_temp > r_orig:   
            #print(f"Case: r_temp({r_temp}) > r_orig({r_orig}) - Need vertical padding")  
            h_ext = int(w / (2 * r_orig) - h / 2) if r_orig > 0 else 0   
            #print(f"Calculated h_ext = {h_ext}")  
            
            if h_ext >= 0:   
                #print(f"Creating new box with dimensions: {h + h_ext * 2}x{w}")  
                box = np.zeros((h + h_ext * 2, w, 4), dtype=np.uint8)  
                #print(f"Placing temp_box at position [0:h, 0:w] = [0:{h}, 0:{w}]")  
                # The rows are full, and there should be no empty lines above the text; otherwise, when multiple text boxes have their top edges aligned, the text cannot be aligned. Common scenario: borderless comics, CG. 
                # When there are bubbles on the current page, it can be changed to center: box[h_ext:h_ext+h, 0:w] = temp_box, requiring more accurate bubble detection.
                box[0:h, 0:w] = temp_box  
            else:   
                #print("h_ext < 0, using original temp_box")  
                box = temp_box.copy()   
        else:   
            #print(f"Case: r_temp({r_temp}) <= r_orig({r_orig}) - Need horizontal padding")  
            w_ext = int((h * r_orig - w) / 2)  
            #print(f"Calculated w_ext = {w_ext}")  
            
            if w_ext >= 0:  
                #print(f"Creating new box with dimensions: {h}x{w + w_ext * 2}")  
                box = np.zeros((h, w + w_ext * 2, 4), dtype=np.uint8)  
                #print(f"Placing temp_box at position [0:h, w_ext:w_ext+w] = [0:{h}, {w_ext}:{w_ext+w}]") 
                # Rows are fully filled, columns are centered
                box[0:h, w_ext:w_ext+w] = temp_box  
            else:   
                #print("w_ext < 0, using original temp_box")  
                box = temp_box.copy()   
    #print(f"Final box dimensions: {box.shape if box is not None else 'None'}")  

    src_points = np.array([[0, 0], [box.shape[1], 0], [box.shape[1], box.shape[0]], [0, box.shape[0]]]).astype(np.float32)
    #src_pts[:, 0] = np.clip(np.round(src_pts[:, 0]), 0, enlarged_w * 2)
    #src_pts[:, 1] = np.clip(np.round(src_pts[:, 1]), 0, enlarged_h * 2)

    M, _ = cv2.findHomography(src_points, dst_points, cv2.RANSAC, 5.0)
    rgba_region = cv2.warpPerspective(box, M, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    x, y, w, h = cv2.boundingRect(dst_points.astype(np.int32))
    canvas_region = rgba_region[y:y+h, x:x+w, :3]
    mask_region = rgba_region[y:y+h, x:x+w, 3:4].astype(np.float32) / 255.0
    img[y:y+h, x:x+w] = np.clip((img[y:y+h, x:x+w].astype(np.float32) * (1 - mask_region) + canvas_region.astype(np.float32) * mask_region), 0, 255).astype(np.uint8)
    return img

async def dispatch_eng_render(img_canvas: np.ndarray, original_img: np.ndarray, text_regions: List[TextBlock], font_path: str = '', line_spacing: int = 0, disable_font_border: bool = False) -> np.ndarray:
    if len(text_regions) == 0:
        return img_canvas

    if not font_path:
        font_path = os.path.join(BASE_PATH, 'fonts/comic shanns 2.ttf')
    text_render.set_font(font_path)

    return render_textblock_list_eng(img_canvas, text_regions, line_spacing=line_spacing, size_tol=1.2, original_img=original_img, downscale_constraint=0.8,disable_font_border=disable_font_border)

async def dispatch_eng_render_pillow(img_canvas: np.ndarray, original_img: np.ndarray, text_regions: List[TextBlock], font_path: str = '', line_spacing: int = 0, disable_font_border: bool = False) -> np.ndarray:
    if len(text_regions) == 0:
        return img_canvas

    if not font_path:
        # Arial Unicode covers Vietnamese precomposed diacritics (ặ ẫ ử ợ …);
        # the original NotoSansMonoCJK-VF fallback misses them.
        font_path = os.path.join(BASE_PATH, 'fonts/Arial-Unicode-Regular.ttf')
    text_render.set_font(font_path)

    return render_textblock_list_eng_pillow(font_path, img_canvas, text_regions, original_img=original_img, downscale_constraint=0.95)
