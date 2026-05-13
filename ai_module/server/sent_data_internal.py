import json
import pickle
from typing import Mapping, Optional, Callable

import aiohttp
from PIL.Image import Image
from fastapi import HTTPException

from manga_translator import Config

NotifyType = Optional[Callable[[int, Optional[bytes]], None]]


def _decode_error_body(body: bytes) -> str:
    try:
        return body.decode("utf-8")
    except UnicodeDecodeError:
        return f"Non-text upstream response ({len(body)} bytes)"


def _decode_success_body(body: bytes, content_type: str):
    if "application/octet-stream" in content_type.lower() or body[:1] == b"\x80":
        try:
            return pickle.loads(body)
        except (pickle.UnpicklingError, EOFError, AttributeError, ValueError):
            raise HTTPException(502, detail="Invalid pickle response from upstream")

    try:
        return json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HTTPException(502, detail="Invalid JSON response from upstream")

async def fetch_data_stream(url, image: Image, config: Config, sender: NotifyType, headers: Mapping[str, str] = {}):
    attributes = {"image": image, "config": config}
    data = pickle.dumps(attributes)

    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=data, headers=headers) as response:
            if response.status == 200:
                await process_stream(response, sender)
            else:
                raise HTTPException(response.status, detail=_decode_error_body(await response.read()))

async def fetch_data(url, image: Image, config: Config, headers: Mapping[str, str] = {}):
    attributes = {"image": image, "config": config}
    data = pickle.dumps(attributes)

    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=data, headers=headers) as response:
            body = await response.read()
            if response.status == 200:
                return _decode_success_body(body, response.headers.get("Content-Type", ""))
            else:
                raise HTTPException(response.status, detail=_decode_error_body(body))

async def process_stream(response, sender: NotifyType):
    buffer = b''

    async for chunk in response.content.iter_any():
        if chunk:
            buffer += chunk
            buffer = handle_buffer(buffer, sender)



def handle_buffer(buffer, sender: NotifyType):
    while len(buffer) >= 5:
        status, expected_size = extract_header(buffer)

        if len(buffer) >= 5 + expected_size:
            data = buffer[5:5 + expected_size]
            sender(status, data)
            buffer = buffer[5 + expected_size:]
        else:
            break
    return buffer


def extract_header(buffer):
    """Extract the status and expected size from the buffer."""
    status = int.from_bytes(buffer[0:1], byteorder='big')
    expected_size = int.from_bytes(buffer[1:5], byteorder='big')
    return status, expected_size

