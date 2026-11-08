import urllib.request
import uuid
import sys

def submit_test_form():
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    fields = {
        "اسم العلامة التجارية / الكيان (Brand Name)": "أكاديمية أساس للذكاء الاصطناعي",
        "المنصة المستهدفة (Platform)": "TikTok / Reels (سكريبت فيديو قصير 60 ثانية)",
        "اللهجة ونبرة الصوت (Dialect & Tone)": "عربية فصحى معاصرة رصينة (نبرة أساس المؤسسية)",
        "الجمهور المستهدف (Target Audience)": "المطورون ومهندسو البرمجيات والذكاء الاصطناعي (Developers & Engineers)",
        "فكرة الحملة أو المنشور (Campaign Topic / Angle)": "الفرق بين مسار هندسة الذكاء الاصطناعي ومسار الذكاء الاصطناعي العملي"
    }

    body = bytearray()
    for name, val in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{val}\r\n".encode("utf-8"))
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    url = "http://localhost:5678/form/128b22ba-f198-45ed-9984-f81c88fce565"
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    })

    try:
        res = urllib.request.urlopen(req)
        print("POST Status:", res.status)
        print("Response:", res.read().decode("utf-8")[:600])
    except urllib.error.HTTPError as e:
        print("POST HTTPError:", e.code)
        print("Error Body:", e.read().decode("utf-8")[:600])
    except Exception as e:
        print("Exception:", e)

if __name__ == "__main__":
    submit_test_form()
