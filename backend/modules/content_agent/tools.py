"""Narrow, deterministic, read-only agent tools and brand guardrails (ASAAS AI Skills)."""

import re
from typing import Any

BANNED_CLICHES = [
    "في عصرنا الرقمي المتسارع",
    "في ظل التطور التكنولوجي المتسارع",
    "مما لا شك فيه",
    "تعتبر التقنية",
    "لا يخفى على أحد",
    "في عالم اليوم سريع التغير",
]

SCENE_AND_MARKER_PATTERNS = [
    r"(?m)^\s*(?:#+\s*)?(?:المشهد|مشهد|اللقطة|لقطة|الهوك|المتن|الخاتمة|النموذج|النسخة|سكريبت)\s*[\d٠-٩]*\s*[:\-–—]?\s*",
    r"\[\s*(?:مشهد|المشهد|كاميرا|موسيقى|مؤثر|صوت|بصري|لقطة|نص على الشاشة|ثانية|ثوان|0|1|2|3|4|5|6|7|8|9)[^\]]*\]",
    r"\(\s*(?:مشهد|المشهد|كاميرا|موسيقى|مؤثر|صوت|بصري|لقطة|نص على الشاشة|ثانية|ثوان|0|1|2|3|4|5|6|7|8|9)[^)]*\)",
    r"\b\d+\s*[-–—]\s*\d+\s*(?:ثانية|ثوانٍ|ثواني|ث|s|sec)\b",
]

PUNCTUATION_AND_SYMBOLS_RE = re.compile(
    r"[.,،؛;:!?؟\-–—_*~`\"'«»()\[\]{}<>|/\\#@$%^&+=•·…\u200b-\u200f]+"
)

EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\U00002600-\U000027BF"
    "]+",
    flags=re.UNICODE,
)


def get_asaas_brand_guidelines() -> dict[str, Any]:
    """Read-only tool: Returns ASAAS official brand voice, tokens, and banned clichés."""
    return {
        "tool": "asaas_brand_guidelines",
        "brand_identity": "ASAAS AI (أساس للذكاء الاصطناعي)",
        "typography": "Thmanyah (ثمانية) - Serif Display للعناوين و Sans للنصوص والأرقام",
        "brand_colors": {
            "primary_gold": "#BA9555",
            "ink": "#221F1F",
            "sand": "#D3C6B4",
        },
        "voice_standard": "كلمات عربية قصيرة ومباشرة، أفعال حاسمة، نبرة واثقة دافئة بدون تكلف أو حشو إنشائي، أرقام وحقائق واضحة.",
        "banned_cliches": BANNED_CLICHES,
        "pure_script_policy": "نص منطوق صافٍ بدون أي وصف مشاهد أو إخراج أو رموز أو علامات ترقيم.",
    }


def get_platform_rules(platform: str, target_seconds: int) -> dict[str, Any]:
    """Read-only tool: Returns platform-specific pacing and target word count."""
    words_target = max(25, round(target_seconds * 2.2))
    p = platform.lower()

    if "tiktok" in p or "reels" in p:
        rule = "إيقاع سريع يبدأ بهوك خاطف خلال أول 3 ثوانٍ ثم مقارنة أو فكرة محورية ثم دعوة واضحة للتفاعل."
        angle_hints = [
            "زاوية المقارنة الذكية والحسم السريع",
            "زاوية كسر المفهوم الشائع وتصحيح المسار",
            "زاوية القصة العملية والنتيجة الملموسة",
            "زاوية السؤال المباشر المحفز للتعليق",
            "زاوية خارطة الطريق المختصرة",
        ]
    elif "linkedin" in p:
        rule = "طرح قيادي تحليلي يخاطب صناع القرار بلغة الأثر العملي والعائد الحقيقي مع دعوة لنقاش مهني."
        angle_hints = [
            "القيادة الفكرية وتحليل السوق بالأرقام",
            "تشخيص مشكلة تشغيلية وحلها العملي",
            "درس تطبيقي مباشر مع دعوة لمشاركة الرأي",
            "مقارنة بين النهج التقليدي والنهج الوكيل",
            "رؤية استراتيجية قصيرة للمدراء",
        ]
    elif "twitter" in p or "x /" in p or p.startswith("x"):
        rule = "جمل مكثفة قصيرة وحادة تلتقط الانتباه من أول سطر بدون أي إطالة زائدة."
        angle_hints = [
            "افتتاحية صادمة وحقيقة مركزة",
            "مقارنة سريعة من نقطتين",
            "نصيحة عملية مكثفة قابلة للحفظ",
            "سؤال جدلي ذكي يفتح النقاش",
            "خلاصة تنفيذية فورية",
        ]
    elif "instagram" in p:
        rule = "سرد قريب وملهم يربط القيمة التقنية بالتجربة الإنسانية والعملية اليومية."
        angle_hints = [
            "سرد قصصي ملهم ومباشر",
            "تبسيط فكرة معقدة بأسلوب قريب",
            "توجيه عملي سريع قابل للتطبيق",
            "تحدي ذهني خفيف للمتابعين",
            "دعوة حماسية للانضمام أو الحفظ",
        ]
    else:
        rule = "خطاب تفاعلي مجتمعي واضح يشرح القيمة ببساطة ويشجع على النقاش والمشاركة."
        angle_hints = [
            "طرح مجتمعي تفاعلي مباشر",
            "مثال واقعي قريب من حياة المتابع",
            "إجابة واضحة على سؤال متكرر",
            "مقارنة مبسطة بين خيارين",
            "دعوة مفتوحة لتبادل التجارب",
        ]

    return {
        "tool": "platform_adaptation_rules",
        "platform": platform,
        "target_seconds": target_seconds,
        "target_words": words_target,
        "pacing_rule": rule,
        "angle_hints": angle_hints,
    }


def get_dialect_guidance(dialect: str) -> dict[str, str]:
    """Read-only tool: Returns explicit linguistic tone rules for the chosen dialect."""
    d = dialect.lower()
    if "سعودية" in d or "خليجية" in d:
        style = "لهجة سعودية وخليجية بيضاء مهنية مفهومة في كل الخليج والعالم العربي، بدون مصطلحات عامية مفرطة."
    elif "مصرية" in d:
        style = "لهجة مصرية راقية وطبيعية سلسة في النطق ومناسبة للمحتوى المهني والتقني."
    elif "شامية" in d:
        style = "لهجة شامية بيضاء مبسطة ومباشرة تحافظ على الاحترافية وسلاسة الإلقاء."
    elif "data" in d or "أرقام" in d:
        style = "عربية فصحى تقنية حادة تركز على الحقائق والمنهجيات والأثر القابل للقياس."
    else:
        style = "عربية فصحى معاصرة رصينة خفيفة على الأذن تناسب الإلقاء الصوتي الحديث (نبرة أساس المؤسسية)."

    return {
        "tool": "dialect_tone_rules",
        "dialect": dialect,
        "guidance": style,
    }


def sanitize_script_text(raw_text: str) -> str:
    """Deterministic guardrail: strips scene labels, timestamps, emojis, and punctuation."""
    text = raw_text.strip()
    for pattern in SCENE_AND_MARKER_PATTERNS:
        text = re.sub(pattern, " ", text)
    text = EMOJI_RE.sub(" ", text)
    text = PUNCTUATION_AND_SYMBOLS_RE.sub(" ", text)
    # Collapse multiple spaces and blank lines into clean spoken lines
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    cleaned = "\n".join(line for line in lines if line)
    return cleaned.strip()


def detect_brand_violations(scripts: list[str], target_seconds: int) -> list[str]:
    """Deterministic policy checks complementary to the LLM Reflexion Evaluator."""
    violations: list[str] = []
    expected_words = max(25, round(target_seconds * 2.2))
    min_words = max(12, int(expected_words * 0.4))
    max_words = int(expected_words * 2.1)

    for idx, script in enumerate(scripts, start=1):
        for cliche in BANNED_CLICHES:
            if cliche in script:
                violations.append(f"السكريبت {idx} يحتوي على عبارة إنشائية محظورة: {cliche}")
        word_count = len(script.split())
        if word_count < min_words:
            violations.append(f"السكريبت {idx} أقصر من المدة المستهدفة ({word_count} كلمة مقابل ~{expected_words})")
        elif word_count > max_words:
            violations.append(f"السكريبت {idx} أطول بكثير من المدة المستهدفة ({word_count} كلمة مقابل ~{expected_words})")

    return violations


def estimate_reading_seconds(text: str) -> int:
    words = len(text.split())
    return max(1, round(words / 2.2))
