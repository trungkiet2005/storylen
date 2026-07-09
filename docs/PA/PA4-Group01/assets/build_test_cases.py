# -*- coding: utf-8 -*-
"""Build StoryLens PA4 Test Cases -> ../test_cases.docx"""
import os
from _doc import *
from test_data import USE_CASES, TEST_CASES, totals

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "test_cases.docx")

doc = new_doc()
T = totals()

# ============================== TITLE PAGE ==============================
P(doc, "TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN – ĐHQG TP.HCM", bold=True, align="center", size=13, after=2)
P(doc, "KHOA CÔNG NGHỆ THÔNG TIN", bold=True, align="center", size=13, after=2)
P(doc, "CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo", italic=True, align="center", size=12, after=30)
for _ in range(2): doc.add_paragraph()
P(doc, "BỘ TEST CASE", bold=True, align="center", size=24, after=4, color=NAVY)
P(doc, "(Test Cases)", italic=True, align="center", size=14, after=10, color=GREY)
P(doc, "STORYLENS", bold=True, align="center", size=30, after=2, color=ACCENT)
P(doc, f"{len(USE_CASES)} use-case  ·  {T['total']} test case  ·  "
       f"{T['passed']} Pass  ·  {T['failed']} Fail  ·  {T['not_executed']} Not Executed",
  italic=True, align="center", size=12.5, after=40)
for _ in range(2): doc.add_paragraph()
P(doc, "PA4 — Kiểm thử phần mềm", bold=True, align="center", size=13, after=2)
P(doc, "Nhóm 1 – StoryLens", bold=True, align="center", size=13, after=2)
P(doc, "TP. Hồ Chí Minh, tháng 07 năm 2026", italic=True, align="center", size=12, after=2)
page_break(doc)

HEADERS = ["Test Case ID", "Tiêu đề", "Điều kiện tiên quyết", "Các bước thực hiện",
           "Dữ liệu kiểm thử", "Kết quả mong đợi", "Kết quả thực tế", "Trạng thái", "Ghi chú"]
WIDTHS = [0.85, 1.35, 1.1, 1.55, 1.05, 1.55, 1.55, 0.7, 1.6]

for uc in USE_CASES:
    H1(doc, f"{uc['id']} — {uc['name']}")
    P(doc, uc["desc"], italic=True, color=GREY, size=11, after=4)
    P(doc, "Mã nguồn liên quan: " + uc["files"], size=10, color=NAVY, after=8)
    tcs = [t for t in TEST_CASES if t["uc"] == uc["id"]]
    rows = []
    for t in tcs:
        rows.append([t["id"], t["title"], t["precond"], t["steps"], t["data"],
                     t["expected"], t["actual"], t["status"], t.get("note", "")])
    table(doc, HEADERS, rows, widths=WIDTHS, fontsize=8.5)
    n_pass = sum(1 for t in tcs if t["status"] == "Pass")
    n_fail = sum(1 for t in tcs if t["status"] == "Fail")
    n_ne = sum(1 for t in tcs if t["status"] not in ("Pass", "Fail"))
    P(doc, f"Tổng {len(tcs)} test case — Pass: {n_pass}, Fail: {n_fail}, Not Executed/Blocked: {n_ne}.",
      bold=True, size=10.5, color=NAVY, after=4)
    page_break(doc)

doc.save(OUT)
print("Saved:", OUT)
