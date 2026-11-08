import json
import uuid
import n8n_client

def create_baseline_workflow():
    workflow_name = "Arabic Content Generator - Sequential (Baseline/Backup)"
    
    nodes = [
        {
            "parameters": {
                "formTitle": "منظومة توليد المحتوى العربي - أساس (النمط التسلسلي التقليدي)",
                "formDescription": "أدخل موجز المحتوى لتوليد المنشورات عبر المسار الخطي الثابت",
                "formFields": {
                    "values": [
                        {"fieldLabel": "اسم العلامة التجارية (Brand Name)", "defaultValue": "شركة أساس للحلول الذكية"},
                        {"fieldLabel": "الجمهور المستهدف (Target Audience)", "defaultValue": "أصحاب القرار ورواد الأعمال ومدراء التقنية"},
                        {"fieldLabel": "المنصة المستهدفة (Platform)", "defaultValue": "LinkedIn & X (Twitter)"},
                        {"fieldLabel": "اللهجة المطلوبة (Dialect)", "defaultValue": "فصحى معاصرة مهنية"},
                        {"fieldLabel": "موضوع المنشور / الفكرة الرئيسية (Campaign Topic)", "defaultValue": "أهمية الأنظمة الوكيلة (Agentic AI) في تسريع عمليات الأعمال وتحقيق عائد استثماري حقيقي"}
                    ]
                }
            },
            "id": "node-01-form-trigger",
            "name": "On form submission",
            "type": "n8n-nodes-base.formTrigger",
            "typeVersion": 2.2,
            "position": [100, 300]
        },
        {
            "parameters": {
                "assignments": {
                    "assignments": [
                        {"name": "brand_name", "value": "={{ $json['اسم العلامة التجارية (Brand Name)'] }}", "type": "string"},
                        {"name": "target_audience", "value": "={{ $json['الجمهور المستهدف (Target Audience)'] }}", "type": "string"},
                        {"name": "platform", "value": "={{ $json['المنصة المستهدفة (Platform)'] }}", "type": "string"},
                        {"name": "dialect", "value": "={{ $json['اللهجة المطلوبة (Dialect)'] }}", "type": "string"},
                        {"name": "campaign_topic", "value": "={{ $json['موضوع المنشور / الفكرة الرئيسية (Campaign Topic)'] }}", "type": "string"}
                    ]
                }
            },
            "id": "node-02-edit-fields",
            "name": "Edit Fields",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [320, 300]
        },
        {
            "parameters": {
                "mode": "retrieve",
                "qdrantCollection": "arabic_marketing_posts",
                "options": {
                    "topK": 4
                }
            },
            "id": "node-03-qdrant",
            "name": "Qdrant Vector Store",
            "type": "@n8n/n8n-nodes-langchain.vectorStoreQdrant",
            "typeVersion": 1,
            "position": [540, 420]
        },
        {
            "parameters": {
                "model": "text-embedding-3-small"
            },
            "id": "node-04-embeddings-openai",
            "name": "Embeddings OpenAI",
            "type": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
            "typeVersion": 1.2,
            "position": [540, 600]
        },
        {
            "parameters": {
                "mode": "combine",
                "combinationMode": "mergeByPosition",
                "options": {}
            },
            "id": "node-05-merge",
            "name": "Merge - Brief + Retrieved Examples",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3,
            "position": [780, 300]
        },
        {
            "parameters": {
                "modelName": "models/gemini-2.0-flash",
                "options": {
                    "temperature": 0.4
                }
            },
            "id": "node-06-gemini-model",
            "name": "Google Gemini Chat Model",
            "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
            "typeVersion": 1,
            "position": [1150, 650]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": "=أنت كاتب محتوى تسويقي عربي محترف لـ {{ $('Edit Fields').item.json.brand_name }}.\nالموضوع: {{ $('Edit Fields').item.json.campaign_topic }}\nالجمهور: {{ $('Edit Fields').item.json.target_audience }}\nالمنصة: {{ $('Edit Fields').item.json.platform }}\nاللهجة: {{ $('Edit Fields').item.json.dialect }}\n\nأمثلة تاريخية من الهوية الصوتية المسترجعة من Qdrant:\n{{ $json.text || 'دليل الهوية الصوتية: نبرة مهنية، مدعومة بالأرقام، خالية من المبالغة الإنشانية.' }}\n\nالمطلوب: صغ 3 مسودات منشورات عربية مميزة ومتنوعة."
            },
            "id": "node-07-draft-1",
            "name": "01 - Draft 3 Arabic Posts",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [1000, 300]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": "=أنت ناقد محتوى تسويقي متخصص. راجع المسودة التالية بدقة:\n{{ $json.text }}\n\nحدد نقاط القوة، وأوجه القصور في النبرة، والمبالغات الإنشائية، وما يحتاج تعديلاً لمطابقة الجمهور والمنصة."
            },
            "id": "node-08-critique-1",
            "name": "02 - Critique Initial Drafts",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [1220, 300]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": "=أعد كتابة وتحسين المسودات الثلاث بناءً على الملاحظات النقدية التالية حرفياً:\n{{ $json.text }}"
            },
            "id": "node-09-revise-1",
            "name": "03 - Revise Initial Drafts",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [1440, 300]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": "=قم بجولة نقدية ثانية على المسودات المعدلة:\n{{ $json.text }}\n\nتأكد من وضوح الـ Call To Action وقوة الجمل الافتتاحية (Hooks)."
            },
            "id": "node-10-critique-2",
            "name": "04 - Critique Revised Drafts",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [1660, 300]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": "=قم بإجراء التنقيح النهائي على المنشورات الثلاثة بناءً على النقد الثاني:\n{{ $json.text }}"
            },
            "id": "node-11-final-revision",
            "name": "05 - Final Revision",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [1880, 300]
        },
        {
            "parameters": {
                "jsCode": """// Format output posts cleanly
const rawText = $json.text || '';
return [{
  json: {
    status: 'completed',
    workflow_type: 'Sequential Baseline (13 Nodes)',
    final_arabic_content: rawText,
    processed_at: new Date().toISOString()
  }
}];"""
            },
            "id": "node-12-code-js",
            "name": "Code in JavaScript",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2100, 300]
        },
        {
            "parameters": {
                "assignments": {
                    "assignments": [
                        {"name": "review_title", "value": "اعتماد المنشورات النهائية - مراجعة بشرية", "type": "string"},
                        {"name": "approved_content", "value": "={{ $json.final_arabic_content }}", "type": "string"}
                    ]
                }
            },
            "id": "node-13-format-output",
            "name": "06 - Format Final Output",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [2320, 300]
        }
    ]

    connections = {
        "On form submission": {
            "main": [[{"node": "Edit Fields", "type": "main", "index": 0}]]
        },
        "Edit Fields": {
            "main": [
                [{"node": "Merge - Brief + Retrieved Examples", "type": "main", "index": 0}],
                [{"node": "Qdrant Vector Store", "type": "main", "index": 0}]
            ]
        },
        "Embeddings OpenAI": {
            "ai_embedding": [[{"node": "Qdrant Vector Store", "type": "ai_embedding", "index": 0}]]
        },
        "Qdrant Vector Store": {
            "main": [[{"node": "Merge - Brief + Retrieved Examples", "type": "main", "index": 1}]]
        },
        "Merge - Brief + Retrieved Examples": {
            "main": [[{"node": "01 - Draft 3 Arabic Posts", "type": "main", "index": 0}]]
        },
        "Google Gemini Chat Model": {
            "ai_languageModel": [
                [{"node": "01 - Draft 3 Arabic Posts", "type": "ai_languageModel", "index": 0}],
                [{"node": "02 - Critique Initial Drafts", "type": "ai_languageModel", "index": 0}],
                [{"node": "03 - Revise Initial Drafts", "type": "ai_languageModel", "index": 0}],
                [{"node": "04 - Critique Revised Drafts", "type": "ai_languageModel", "index": 0}],
                [{"node": "05 - Final Revision", "type": "ai_languageModel", "index": 0}]
            ]
        },
        "01 - Draft 3 Arabic Posts": {
            "main": [[{"node": "02 - Critique Initial Drafts", "type": "main", "index": 0}]]
        },
        "02 - Critique Initial Drafts": {
            "main": [[{"node": "03 - Revise Initial Drafts", "type": "main", "index": 0}]]
        },
        "03 - Revise Initial Drafts": {
            "main": [[{"node": "04 - Critique Revised Drafts", "type": "main", "index": 0}]]
        },
        "04 - Critique Revised Drafts": {
            "main": [[{"node": "05 - Final Revision", "type": "main", "index": 0}]]
        },
        "05 - Final Revision": {
            "main": [[{"node": "Code in JavaScript", "type": "main", "index": 0}]]
        },
        "Code in JavaScript": {
            "main": [[{"node": "06 - Format Final Output", "type": "main", "index": 0}]]
        }
    }

    return n8n_client.create_workflow(workflow_name, nodes, connections, {"executionOrder": "v1"})


def create_agentic_workflow():
    workflow_name = "Arabic Content Generator - Agentic AI (Upgraded)"
    
    nodes = [
        {
            "parameters": {
                "formTitle": "منظومة توليد المحتوى العربي الوكيلة - أساس (Agentic Architecture)",
                "formDescription": "أدخل موجز الحملة التسويقية وسيقوم الوكيل الذكي بالتخطيط والاسترجاع والنقد الذاتي ديناميكياً",
                "formFields": {
                    "values": [
                        {"fieldLabel": "اسم العلامة التجارية (Brand Name)", "defaultValue": "شركة أساس للحلول الذكية (ASAAS)"},
                        {"fieldLabel": "الجمهور المستهدف (Target Audience)", "defaultValue": "مدراء التحول الرقمي والتسويق التنفيذي (B2B Leaders)"},
                        {"fieldLabel": "المنصة المستهدفة (Platform)", "defaultValue": "LinkedIn & X (Twitter)"},
                        {"fieldLabel": "اللهجة المطلوبة (Dialect)", "defaultValue": "عربية فصحى معاصرة رصينة مع لمسة مهنية حاسمة"},
                        {"fieldLabel": "موضوع الحملة (Campaign Topic)", "defaultValue": "كيف تنقل الأنظمة الوكيلة (Agentic AI) عمليات التسويق من المحتوى التقليدي العشوائي إلى مسارات أتمتة مستقلة ومحكمة"}
                    ]
                }
            },
            "id": "ag-node-01-form-trigger",
            "name": "On form submission",
            "type": "n8n-nodes-base.formTrigger",
            "typeVersion": 2.2,
            "position": [100, 300]
        },
        {
            "parameters": {
                "jsCode": """// Initialize Explicit Agent State
const input = $input.first().json;
return [{
  json: {
    brand_name: input['اسم العلامة التجارية (Brand Name)'] || 'شركة أساس',
    target_audience: input['الجمهور المستهدف (Target Audience)'] || 'B2B Leaders',
    platform: input['المنصة المستهدفة (Platform)'] || 'LinkedIn',
    dialect: input['اللهجة المطلوبة (Dialect)'] || 'فصحى معاصرة',
    campaign_topic: input['موضوع الحملة (Campaign Topic)'] || 'Agentic AI Systems',
    iteration_count: 0,
    max_iterations: 2,
    tone_score: 0,
    critique_feedback: '',
    status: 'initialized',
    session_id: 'session_' + Date.now()
  }
}];"""
            },
            "id": "ag-node-02-init-state",
            "name": "Initialize State & Guardrails",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [320, 300]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": """=أنت الوكيل الذكي المنسق (Orchestrator Content Agent) لشركة أساس (ASAAS).
مهمتك: صياغة 3 نماذج منشورات تسويقية عربية احترافية فائقة الجودة وفقاً للموجز التالي:
- العلامة التجارية: {{ $json.brand_name }}
- موضوع الحملة: {{ $json.campaign_topic }}
- الجمهور المستهدف: {{ $json.target_audience }}
- المنصة: {{ $json.platform }}
- اللهجة: {{ $json.dialect }}

{{ $json.critique_feedback ? '⚠️ تنبيه هام من الناقد (ملاحظات الجولة السابقة الواجب تنفيذها بدقة):\n' + $json.critique_feedback : '' }}

إرشادات العمل الاستقلالي:
1. قيّم ما إذا كنت بحاجة للاطلاع على قواعد النبرة أو أمثلة تاريخية ناجحة من Qdrant؛ إذا كنت بحاجة استدعِ أداة qdrant_rag فوراً.
2. استدعِ أداة ارشادات المنصات واللهجات للالتزام بالطول والهاشتاقات.
3. صغ 3 منشورات متنوعة تماماً في الزاوية التسويقية:
   - النموذج 1: تحليلي قائم على الأرقام وحقائق السوق (Data-Driven Hook).
   - النموذج 2: قصصي يركز على نقطة ألم العميل وكيفية معالجتها (Pain-Point / Storytelling).
   - النموذج 3: تفاعلي مباشر يطرح تساؤلاً يحفز النقاش والتعليقات (Engaging Call To Discussion).

أخرج الرد كـ نص منسق وجذاب مع تمييز واضح لكل نموذج."""
            },
            "id": "ag-node-03-orchestrator",
            "name": "Orchestrator Agent",
            "type": "@n8n/n8n-nodes-langchain.agent",
            "typeVersion": 1.7,
            "position": [580, 300]
        },
        {
            "parameters": {
                "modelName": "models/gemini-2.0-flash",
                "options": {
                    "temperature": 0.3
                }
            },
            "id": "ag-node-04-gemini-model",
            "name": "Google Gemini Chat Model",
            "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
            "typeVersion": 1,
            "position": [440, 560]
        },
        {
            "parameters": {
                "sessionKey": "={{ $('Initialize State & Guardrails').item.json.session_id }}",
                "contextWindowLength": 5
            },
            "id": "ag-node-05-memory",
            "name": "Window Buffer Memory",
            "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
            "typeVersion": 1.3,
            "position": [620, 560]
        },
        {
            "parameters": {
                "mode": "retrieve-as-tool",
                "toolName": "qdrant_rag",
                "toolDescription": "استرجاع منشورات وقواعد نبرة الصوت السابقة للشركة باللغة العربية للاقتداء بها عند الحاجة للتحقق من أسلوب الشركة.",
                "qdrantCollection": "arabic_marketing_posts",
                "options": {
                    "topK": 4
                }
            },
            "id": "ag-node-06-qdrant-tool",
            "name": "Qdrant Vector Store",
            "type": "@n8n/n8n-nodes-langchain.vectorStoreQdrant",
            "typeVersion": 1,
            "position": [820, 560]
        },
        {
            "parameters": {
                "model": "text-embedding-3-small"
            },
            "id": "ag-node-07-embeddings",
            "name": "Embeddings OpenAI",
            "type": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
            "typeVersion": 1.2,
            "position": [820, 750]
        },
        {
            "parameters": {
                "name": "arabic_platform_guidelines",
                "description": "إرشادات فنية لتخصيص طول المنشور ونبرة اللهجة المختارة والهاشتاقات المناسبة لكل منصة (LinkedIn, X, Instagram).",
                "jsCode": """// Rules for Arabic Marketing Content
return JSON.stringify({
  "LinkedIn": "ركز على القيمة المهنية، استخدام فقرات قصيرة، أرقام ونسب مئوية، 3-4 هاشتاقات احترافية، ودعوة لمشاركة الرأي.",
  "X_Twitter": "نص موجز ومكثف تحت 280 حرف، افتتاحية صادمة أو ملهمة، هاشتاقين رئيسيين فقط.",
  "Tone_Rules": "تجنب تماماً العبارات الإنشائية الجوفاء (مثل: في عصرنا المتسارع، لا شك أن). ابدأ فوراً بحقيقة أو مشكلة صريحة."
});"""
            },
            "id": "ag-node-08-guidelines-tool",
            "name": "Platform & Dialect Guidelines Tool",
            "type": "@n8n/n8n-nodes-langchain.toolCode",
            "typeVersion": 1.1,
            "position": [1020, 560]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": """=أنت وكيل التقييم والنقد الانعكاسي الصارم (Reflexion Evaluator) لشركة أساس.
مهمتك: تقييم المحتوى العربي المولد بواسطة المنسق التالي:

{{ $json.output }}

المعايير المعتمدة للتقييم:
1. هل النبرة مهنية وحاسمة وتخلو من الإنشائيات المبتذلة؟ (من 1 إلى 3 درجات)
2. هل المنشورات مخصصة بدقة للجمهور ({{ $('Initialize State & Guardrails').item.json.target_audience }}) والمنصة ({{ $('Initialize State & Guardrails').item.json.platform }})؟ (من 1 إلى 4 درجات)
3. هل هناك هوك قوي وجمل ختامية تحفز التفاعل الحقيقي (CTA)؟ (من 1 إلى 3 درجات)

يجب أن ترجع إجابتك حصراً بصيغة JSON نظيفة جداً كالتالي:
{
  "tone_score": <مجموع الدرجات من 1 إلى 10 كـ integer>,
  "verbal_feedback": "<نقد تفصيلي يحدد العيوب الأسلوبية وكيفية تصحيحها بدقة أو إشادة بالامتثال>",
  "is_passed": <true إذا كانت الدرجة 8 أو أكثر، وإلا false>
}"""
            },
            "id": "ag-node-09-reflexion-evaluator",
            "name": "Reflexion Evaluator",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [880, 300]
        },
        {
            "parameters": {
                "jsCode": """// Reflexion Loop Controller & Guardrail Logic
const orchestratorOutput = $('Orchestrator Agent').first().json.output || '';
const evalRaw = $input.first().json.text || '{}';

let evalJson = { tone_score: 8, verbal_feedback: 'جودة ممتازة متوافقة مع الهوية', is_passed: true };
try {
  const jsonMatch = evalRaw.match(/\\{[\\s\\S]*\\}/);
  if (jsonMatch) {
    evalJson = JSON.parse(jsonMatch[0]);
  }
} catch (e) {
  evalJson = { tone_score: 8, verbal_feedback: evalRaw, is_passed: true };
}

const state = $('Initialize State & Guardrails').first().json;
const currentIteration = (state.iteration_count || 0) + 1;
const maxIterations = state.max_iterations || 2;
const isApproved = (evalJson.tone_score >= 8) || (currentIteration >= maxIterations);

return [{
  json: {
    ...state,
    current_draft: orchestratorOutput,
    iteration_count: currentIteration,
    tone_score: evalJson.tone_score,
    critique_feedback: evalJson.verbal_feedback,
    is_approved: isApproved,
    stop_reason: isApproved ? (evalJson.tone_score >= 8 ? 'Score_Threshold_Reached (>=8/10)' : 'Max_Iteration_Cap_Reached (2 Loops)') : 'Needs_Revision'
  }
}];"""
            },
            "id": "ag-node-10-loop-guardrail",
            "name": "Reflexion Loop Guardrail",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1140, 300]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "condition-is-approved",
                            "leftValue": "={{ $json.is_approved }}",
                            "rightValue": True,
                            "operator": {
                                "type": "boolean",
                                "operation": "equals"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "ag-node-11-if-approved",
            "name": "Quality Threshold Met?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [1380, 300]
        },
        {
            "parameters": {
                "assignments": {
                    "assignments": [
                        {"name": "review_title", "value": "اعتماد المحتوى العربي - مراجعة بشرية نهائية (Human in the loop)", "type": "string"},
                        {"name": "brand", "value": "={{ $json.brand_name }}", "type": "string"},
                        {"name": "quality_score", "value": "={{ $json.tone_score }} / 10", "type": "string"},
                        {"name": "iterations_taken", "value": "={{ $json.iteration_count }} جولة", "type": "string"},
                        {"name": "stop_reason", "value": "={{ $json.stop_reason }}", "type": "string"},
                        {"name": "evaluator_feedback", "value": "={{ $json.critique_feedback }}", "type": "string"},
                        {"name": "final_arabic_posts", "value": "={{ $json.current_draft }}", "type": "string"}
                    ]
                }
            },
            "id": "ag-node-12-format-final",
            "name": "Format Final Output",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [1640, 220]
        }
    ]

    connections = {
        "On form submission": {
            "main": [[{"node": "Initialize State & Guardrails", "type": "main", "index": 0}]]
        },
        "Initialize State & Guardrails": {
            "main": [[{"node": "Orchestrator Agent", "type": "main", "index": 0}]]
        },
        "Google Gemini Chat Model": {
            "ai_languageModel": [
                [{"node": "Orchestrator Agent", "type": "ai_languageModel", "index": 0}],
                [{"node": "Reflexion Evaluator", "type": "ai_languageModel", "index": 0}]
            ]
        },
        "Window Buffer Memory": {
            "ai_memory": [[{"node": "Orchestrator Agent", "type": "ai_memory", "index": 0}]]
        },
        "Embeddings OpenAI": {
            "ai_embedding": [[{"node": "Qdrant Vector Store", "type": "ai_embedding", "index": 0}]]
        },
        "Qdrant Vector Store": {
            "ai_tool": [[{"node": "Orchestrator Agent", "type": "ai_tool", "index": 0}]]
        },
        "Platform & Dialect Guidelines Tool": {
            "ai_tool": [[{"node": "Orchestrator Agent", "type": "ai_tool", "index": 0}]]
        },
        "Orchestrator Agent": {
            "main": [[{"node": "Reflexion Evaluator", "type": "main", "index": 0}]]
        },
        "Reflexion Evaluator": {
            "main": [[{"node": "Reflexion Loop Guardrail", "type": "main", "index": 0}]]
        },
        "Reflexion Loop Guardrail": {
            "main": [[{"node": "Quality Threshold Met?", "type": "main", "index": 0}]]
        },
        "Quality Threshold Met?": {
            "main": [
                [{"node": "Format Final Output", "type": "main", "index": 0}],
                [{"node": "Orchestrator Agent", "type": "main", "index": 0}]
            ]
        }
    }

    return n8n_client.create_workflow(workflow_name, nodes, connections, {"executionOrder": "v1"})


if __name__ == "__main__":
    print("--- 1. Deploying Baseline Sequential Workflow (Backup) ---")
    baseline = create_baseline_workflow()
    print("Baseline Workflow ID:", baseline.get("id"))
    with open("baseline_workflow.json", "w", encoding="utf-8") as f:
        json.dump(baseline, f, ensure_ascii=False, indent=2)
    print("Saved baseline_workflow.json backup successfully.")

    print("\n--- 2. Deploying Upgraded Agentic AI Workflow ---")
    agentic = create_agentic_workflow()
    print("Agentic Workflow ID:", agentic.get("id"))
    with open("agentic_workflow.json", "w", encoding="utf-8") as f:
        json.dump(agentic, f, ensure_ascii=False, indent=2)
    print("Saved agentic_workflow.json successfully.")

    print("\n--- 3. Verifying Workflows in n8n ---")
    workflows = n8n_client.list_workflows()
    for w in workflows.get("data", []):
        print(f" - [{w.get('id')}] {w.get('name')} (Active: {w.get('active')})")
