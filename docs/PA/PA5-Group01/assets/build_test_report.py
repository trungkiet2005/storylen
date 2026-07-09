# -*- coding: utf-8 -*-
"""Build StoryLens PA5 Automated Test Report -> ../PA5-Automated-Test-Report.docx"""
import os
from _doc import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "PA5-Automated-Test-Report.docx")

doc = new_doc()

# ============================== TITLE PAGE ==============================
P(doc, "TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN – ĐHQG TP.HCM", bold=True, align="center", size=13, after=2)
P(doc, "KHOA CÔNG NGHỆ THÔNG TIN", bold=True, align="center", size=13, after=2)
P(doc, "CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo", italic=True, align="center", size=12, after=30)
for _ in range(2): doc.add_paragraph()
P(doc, "BÁO CÁO KIỂM THỬ TỰ ĐỘNG", bold=True, align="center", size=24, after=4, color=NAVY)
P(doc, "(Automated Test Report — PA5, phần a)", italic=True, align="center", size=14, after=10, color=GREY)
P(doc, "STORYLENS", bold=True, align="center", size=30, after=2, color=ACCENT)
P(doc, "Thực thi thật ngày 09/07/2026, 13:59–14:00", italic=True, align="center", size=12.5, after=40)
for _ in range(2): doc.add_paragraph()
P(doc, "PA5 — Kiểm thử tự động (phần a, 10 điểm)", bold=True, align="center", size=13, after=2)
P(doc, "Nhóm 1 – StoryLens", bold=True, align="center", size=13, after=2)
P(doc, "GVHD: GS.TS Nguyễn Văn Vũ · ThS. Trương Phước Lộc · ThS. Ngô Ngọc Đăng Khoa",
  italic=True, align="center", size=11.5, after=2, color=GREY)
P(doc, "TP. Hồ Chí Minh, tháng 07 năm 2026", italic=True, align="center", size=12, after=2)
page_break(doc)

# ============================== 1. OVERVIEW ==============================
H1(doc, "1. Tổng quan")
P(doc, "PA5 phần (a) yêu cầu kiểm thử tự động cho tối thiểu hai use-case, mỗi use-case tối thiểu hai "
       "scenario, sử dụng một công cụ kiểm thử tự động. Nhóm dùng Katalon Studio (Runtime Engine, "
       "chế độ dòng lệnh) để thực thi 4 test case tự động, thao tác trực tiếp trên ứng dụng đang chạy "
       "production thật tại storylen.vercel.app — không mock, không giả lập kết quả.", align="justify")
table(doc, ["Mục", "Giá trị"], [
    ["Ứng dụng kiểm thử", "https://storylen.vercel.app/"],
    ["Công cụ kiểm thử tự động", "Katalon Studio 11.3.0 (katalonc, chế độ CLI)"],
    ["Trình duyệt", "Chrome 150.0.7871.49"],
    ["Ngày & giờ thực thi", "09/07/2026, 13:59–14:00"],
    ["Test Suite", "StoryLensTests / Test Suites/StoryLens Test Suite (run 20260709_135947)"],
    ["Lệnh thực thi",
     'katalonc.exe -runMode=console -testSuitePath="Test Suites/StoryLens Test Suite" -browserType=Chrome'],
    ["Kết quả tổng", "4/4 test case Pass — 100% pass rate — exit code 0"],
], widths=[2.1, 4.7])

# ============================== 2. USE CASE 1 ==============================
H1(doc, "2. Use-case 1 — Đăng nhập (Login)")
P(doc, "Xác nhận biểu mẫu đăng nhập tại /login từ chối đúng các lượt gửi không hợp lệ và không bao "
       "giờ cấp quyền truy cập khi thông tin đăng nhập sai hoặc thiếu.", align="justify")

H2(doc, "2.1 Login_InvalidCredentials")
P(doc, "Mô tả: Gửi biểu mẫu đăng nhập với email/mật khẩu không tồn tại trong hệ thống. "
       "Kỳ vọng: đăng nhập bị từ chối, người dùng vẫn ở lại trang /login.", align="justify")
P(doc, "Kết quả: PASSED", bold=True, color=TEAL, size=12, after=6)
table(doc, ["#", "Hành động", "Kết quả"], [
    ["1", "Mở Chrome, điều hướng tới https://storylen.vercel.app/login", "Passed"],
    ["2", "Nhập email invalid_user_test@example.com vào #login-email", "Passed"],
    ["3", "Nhập mật khẩu WrongPassword123! vào #login-password", "Passed"],
    ["4", 'Nhấn nút gửi "Đăng nhập"', "Passed"],
    ["5", "Xác nhận URL hiện tại vẫn khớp .*/login.*", "Passed"],
], widths=[0.3, 4.6, 0.9])
P(doc, "Test script (Katalon Groovy):", bold=True, size=11, after=2)
code_block(doc,
"""import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

WebUI.openBrowser('')
WebUI.navigateToUrl('https://storylen.vercel.app/login')
WebUI.maximizeWindow()

WebUI.setText(findTestObject('StoryLens/input_LoginEmail'), 'invalid_user_test@example.com')
WebUI.setText(findTestObject('StoryLens/input_LoginPassword'), 'WrongPassword123!')

WebUI.click(findTestObject('StoryLens/button_LoginSubmit'))
WebUI.delay(3)

WebUI.verifyMatch(WebUI.getUrl(), '.*/login.*', true)
WebUI.closeBrowser()""")

H2(doc, "2.2 Login_EmptyFields")
P(doc, "Mô tả: Gửi biểu mẫu đăng nhập khi để trống cả hai trường. "
       "Kỳ vọng: lượt gửi bị chặn, người dùng vẫn ở lại trang /login.", align="justify")
P(doc, "Kết quả: PASSED", bold=True, color=TEAL, size=12, after=6)
table(doc, ["#", "Hành động", "Kết quả"], [
    ["1", "Mở Chrome, điều hướng tới https://storylen.vercel.app/login", "Passed"],
    ["2", 'Nhấn nút gửi "Đăng nhập" mà không nhập trường nào', "Passed"],
    ["3", "Xác nhận URL hiện tại vẫn khớp .*/login.*", "Passed"],
], widths=[0.3, 4.6, 0.9])
P(doc, "Test script (Katalon Groovy):", bold=True, size=11, after=2)
code_block(doc,
"""import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

WebUI.openBrowser('')
WebUI.navigateToUrl('https://storylen.vercel.app/login')
WebUI.maximizeWindow()

WebUI.click(findTestObject('StoryLens/button_LoginSubmit'))
WebUI.delay(2)

WebUI.verifyMatch(WebUI.getUrl(), '.*/login.*', true)
WebUI.closeBrowser()""")
page_break(doc)

# ============================== 3. USE CASE 2 ==============================
H1(doc, "3. Use-case 2 — Điều hướng chính (Main navigation)")
P(doc, "Xác nhận các icon điều hướng chính trên trang chủ dẫn đúng tới các trang tương ứng.",
  align="justify")

H2(doc, "3.1 Nav_ToBrowsePage")
P(doc, 'Mô tả: Từ trang chủ, nhấn icon điều hướng "Kho truyện" (Browse). '
       "Kỳ vọng: URL chuyển thành /browse.", align="justify")
P(doc, "Kết quả: PASSED", bold=True, color=TEAL, size=12, after=6)
table(doc, ["#", "Hành động", "Kết quả"], [
    ["1", "Mở Chrome, điều hướng tới https://storylen.vercel.app/", "Passed"],
    ["2", "Nhấn liên kết điều hướng a[href='/browse']", "Passed"],
    ["3", "Xác nhận URL hiện tại khớp .*/browse.*", "Passed"],
], widths=[0.3, 4.6, 0.9])
P(doc, "Test script (Katalon Groovy):", bold=True, size=11, after=2)
code_block(doc,
"""import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

WebUI.openBrowser('')
WebUI.navigateToUrl('https://storylen.vercel.app/')
WebUI.maximizeWindow()

WebUI.click(findTestObject('StoryLens/link_NavBrowse'))
WebUI.delay(2)

WebUI.verifyMatch(WebUI.getUrl(), '.*/browse.*', true)
WebUI.closeBrowser()""")

H2(doc, "3.2 Nav_ToForumPage")
P(doc, 'Mô tả: Từ trang chủ, nhấn icon điều hướng "Diễn đàn" (Forum). '
       "Kỳ vọng: URL chuyển thành /forum.", align="justify")
P(doc, "Kết quả: PASSED", bold=True, color=TEAL, size=12, after=6)
table(doc, ["#", "Hành động", "Kết quả"], [
    ["1", "Mở Chrome, điều hướng tới https://storylen.vercel.app/", "Passed"],
    ["2", "Nhấn liên kết điều hướng a[href='/forum']", "Passed"],
    ["3", "Xác nhận URL hiện tại khớp .*/forum.*", "Passed"],
], widths=[0.3, 4.6, 0.9])
P(doc, "Test script (Katalon Groovy):", bold=True, size=11, after=2)
code_block(doc,
"""import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

WebUI.openBrowser('')
WebUI.navigateToUrl('https://storylen.vercel.app/')
WebUI.maximizeWindow()

WebUI.click(findTestObject('StoryLens/link_NavForum'))
WebUI.delay(2)

WebUI.verifyMatch(WebUI.getUrl(), '.*/forum.*', true)
WebUI.closeBrowser()""")
page_break(doc)

# ============================== 4. SUMMARY ==============================
H1(doc, "4. Bảng tổng hợp")
table(doc, ["Use-case", "Test case", "Kết quả"], [
    ["UC-1 Đăng nhập (Login)", "Login_InvalidCredentials", "PASSED"],
    ["UC-1 Đăng nhập (Login)", "Login_EmptyFields", "PASSED"],
    ["UC-2 Điều hướng chính", "Nav_ToBrowsePage", "PASSED"],
    ["UC-2 Điều hướng chính", "Nav_ToForumPage", "PASSED"],
], widths=[2.4, 2.6, 1.3])
P(doc, "Tổng kết: 2 use-case, 4 scenario (test case), 4 Pass, 0 Fail — tỉ lệ pass 100%.",
  bold=True, size=12, color=NAVY, after=10)
P(doc, "Object Repository sử dụng locator CSS/ID (#login-email, #login-password, "
       "a[href='/browse'], a[href='/forum']) được ghi trực tiếp từ DOM đã render của "
       "storylen.vercel.app. Toàn bộ kết quả trong tài liệu này là output thật từ lần chạy Katalon "
       "nêu trên — không có số liệu bịa.", align="justify", size=11, color=GREY)

doc.save(OUT)
print("Saved:", OUT)
