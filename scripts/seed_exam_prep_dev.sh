#!/bin/bash
# Seed sample core test (15 questions) for dev_02JY first lecture session.
# Idempotent: deletes existing core test for the same (course, lecture) before inserting.

set -e

COURSE_ID="eb50f1e4-139b-4f93-a696-397d0b99c711"   # dev_02JY
LECTURE_ID="0efb9ab8-ad6f-4589-868b-d69842431133"  # lecture_no=1

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_DEV_SERVICE_ROLE_KEY" ]; then
  echo "[ERROR] need SUPABASE_URL and SUPABASE_DEV_SERVICE_ROLE_KEY in env"
  exit 1
fi

API="$SUPABASE_URL/rest/v1"
HK="apikey: $SUPABASE_DEV_SERVICE_ROLE_KEY"
HA="Authorization: Bearer $SUPABASE_DEV_SERVICE_ROLE_KEY"

echo "[1/3] Delete existing core test (idempotent)"
curl -s -X DELETE \
  "$API/exam_prep_test?course_id=eq.$COURSE_ID&lecture_session_id=eq.$LECTURE_ID&test_type=eq.core" \
  -H "$HK" -H "$HA"
echo ""

echo "[2/3] Insert exam_prep_test"
TEST_RES=$(curl -s -X POST \
  "$API/exam_prep_test" \
  -H "$HK" -H "$HA" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"course_id\": \"$COURSE_ID\",
    \"lecture_session_id\": \"$LECTURE_ID\",
    \"test_type\": \"core\",
    \"segment_index\": null,
    \"owner_user_id\": null
  }")
echo "$TEST_RES"
TEST_ID=$(echo "$TEST_RES" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo "[INFO] test_id = $TEST_ID"

if [ -z "$TEST_ID" ]; then
  echo "[ERROR] failed to insert exam_prep_test"
  exit 1
fi

echo "[3/3] Insert 15 sample questions"
QUESTIONS_JSON=$(cat <<EOF
[
  {"test_id":"$TEST_ID","seq":1,"stem":"De novo 변이(De novo variant)에 대한 설명으로 옳은 것은?","options":["부모로부터 물려받은 변이이다.","정자(sperm)나 난자(egg)에서 새롭게 발생하는 변이이다.","세대를 거듭할수록 점점 줄어드는 변이이다.","모든 인간에게 평균 10개 미만으로 존재한다."],"answer":"1","explanation":{"opt0":"De novo 변이는 부모에게 없던 새로운 변이이므로 틀림.","opt1":"정자/난자 형성 과정에서 새로 생긴 변이가 De novo 변이의 정의입니다.","opt2":"세대를 거듭한다고 줄어들지 않습니다.","opt3":"평균 60-100개 정도로 알려져 있습니다."},"source_ref":null,"difficulty":3},
  {"test_id":"$TEST_ID","seq":2,"stem":"DNA의 기본 구성 단위인 뉴클레오타이드를 이루는 3가지 요소가 아닌 것은?","options":["인산기","당(deoxyribose)","염기","단백질"],"answer":"3","explanation":{"opt0":"인산기는 뉴클레오타이드 구성 요소입니다.","opt1":"디옥시리보스 당이 포함됩니다.","opt2":"A,T,G,C 염기가 포함됩니다.","opt3":"단백질은 뉴클레오타이드의 구성 요소가 아닙니다."},"source_ref":null,"difficulty":1},
  {"test_id":"$TEST_ID","seq":3,"stem":"세포 주기에서 DNA 복제가 일어나는 단계는?","options":["G1기","S기","G2기","M기"],"answer":"1","explanation":{"opt0":"G1기는 세포 성장 단계입니다.","opt1":"S(Synthesis)기에 DNA가 복제됩니다.","opt2":"G2기는 분열 준비 단계입니다.","opt3":"M(Mitosis)기는 분열기입니다."},"source_ref":null,"difficulty":2},
  {"test_id":"$TEST_ID","seq":4,"stem":"멘델의 분리의 법칙(Law of Segregation)에 가장 부합하는 설명은?","options":["감수분열 시 상동염색체가 무작위로 분리된다.","유전자형 비율은 항상 9:3:3:1이다.","우성 형질만 다음 세대에 전달된다.","독립된 형질은 함께 유전된다."],"answer":"0","explanation":{"opt0":"분리의 법칙은 대립유전자가 감수분열 시 분리됨을 의미합니다.","opt1":"이는 양성잡종에서 나타나는 비율로 독립의 법칙입니다.","opt2":"열성도 전달됩니다.","opt3":"이는 연관 또는 독립의 법칙과 관련 있습니다."},"source_ref":null,"difficulty":2},
  {"test_id":"$TEST_ID","seq":5,"stem":"체세포분열(mitosis)과 감수분열(meiosis)의 가장 큰 차이는?","options":["체세포분열은 배우자를 만들고 감수분열은 체세포를 만든다.","감수분열은 염색체 수가 절반이 되는 분열이다.","체세포분열에서만 교차(crossing over)가 일어난다.","감수분열은 1회 분열이다."],"answer":"1","explanation":{"opt0":"반대로, 감수분열이 배우자를 만듭니다.","opt1":"감수분열로 2n → n 으로 염색체 수가 반감됩니다.","opt2":"교차는 감수분열에서 일어납니다.","opt3":"감수분열은 2회 분열입니다."},"source_ref":null,"difficulty":2},
  {"test_id":"$TEST_ID","seq":6,"stem":"전사(transcription)와 번역(translation)에 대한 설명으로 옳은 것은?","options":["전사는 세포질에서, 번역은 핵에서 일어난다.","전사는 DNA → RNA, 번역은 RNA → 단백질 과정이다.","번역은 RNA polymerase 가 수행한다.","두 과정은 동시에 같은 위치에서 일어난다."],"answer":"1","explanation":{"opt0":"진핵세포에서 전사는 핵, 번역은 세포질에서 일어납니다.","opt1":"전사·번역의 정의에 부합합니다.","opt2":"번역은 ribosome 이 수행합니다.","opt3":"진핵세포에서는 분리되어 일어납니다."},"source_ref":null,"difficulty":1},
  {"test_id":"$TEST_ID","seq":7,"stem":"진핵세포의 미토콘드리아의 주된 기능은?","options":["단백질 합성","ATP 생성 (세포 호흡)","DNA 복제","리보솜 조립"],"answer":"1","explanation":{"opt0":"단백질 합성은 리보솜의 역할입니다.","opt1":"미토콘드리아는 호흡을 통한 ATP 생산이 주 기능입니다.","opt2":"DNA 복제는 핵과 미토콘드리아 둘 다에서 일어나지만 주 기능은 아닙니다.","opt3":"리보솜 조립은 인(nucleolus)에서 합니다."},"source_ref":null,"difficulty":1},
  {"test_id":"$TEST_ID","seq":8,"stem":"DNA 이중나선에서 A와 결합하는 염기는?","options":["G","C","T","U"],"answer":"2","explanation":{"opt0":"G는 C와 결합합니다.","opt1":"C는 G와 결합합니다.","opt2":"DNA 에서 A는 T와 상보적으로 결합합니다.","opt3":"U는 RNA 에서 A와 결합합니다."},"source_ref":null,"difficulty":1},
  {"test_id":"$TEST_ID","seq":9,"stem":"단백질의 구조 단계 중 잘못된 것은?","options":["1차 구조: 아미노산 서열","2차 구조: α-나선, β-병풍","3차 구조: 단일 폴리펩타이드의 입체 구조","4차 구조: 단일 사슬의 활성화"],"answer":"3","explanation":{"opt0":"옳음","opt1":"옳음","opt2":"옳음","opt3":"4차 구조는 여러 폴리펩타이드 사슬의 결합입니다."},"source_ref":null,"difficulty":2},
  {"test_id":"$TEST_ID","seq":10,"stem":"광합성에서 빛 에너지를 흡수하는 색소는?","options":["헤모글로빈","엽록소(chlorophyll)","멜라닌","카로틴"],"answer":"1","explanation":{"opt0":"헤모글로빈은 산소 운반 단백질입니다.","opt1":"엽록소가 빛을 흡수해 광합성을 시작합니다.","opt2":"멜라닌은 동물 색소입니다.","opt3":"카로틴은 보조 색소이지만 주된 흡수체는 아닙니다."},"source_ref":null,"difficulty":1},
  {"test_id":"$TEST_ID","seq":11,"stem":"효소(enzyme)의 특징으로 옳지 않은 것은?","options":["반응의 활성화 에너지를 낮춘다.","기질 특이성이 있다.","대부분 단백질로 이루어져 있다.","반응 후 소모되어 사라진다."],"answer":"3","explanation":{"opt0":"옳음","opt1":"옳음","opt2":"옳음 (RNA 효소도 일부 존재)","opt3":"효소는 반응에 소모되지 않고 재사용됩니다."},"source_ref":null,"difficulty":2},
  {"test_id":"$TEST_ID","seq":12,"stem":"인간의 정상 체세포 염색체 수는?","options":["23","46","23 쌍","B와 C 모두"],"answer":"3","explanation":{"opt0":"23은 반수체(n)입니다.","opt1":"46개로 옳습니다.","opt2":"23쌍 = 46개로 옳습니다.","opt3":"46과 23쌍은 같은 의미이므로 둘 다 정답입니다."},"source_ref":null,"difficulty":1},
  {"test_id":"$TEST_ID","seq":13,"stem":"세포막의 주된 구성 성분은?","options":["인지질 이중층","셀룰로오스","키틴","펩티도글리칸"],"answer":"0","explanation":{"opt0":"세포막은 인지질 이중층이 기본 구조입니다.","opt1":"식물 세포벽 성분입니다.","opt2":"곰팡이 세포벽 성분입니다.","opt3":"세균 세포벽 성분입니다."},"source_ref":null,"difficulty":1},
  {"test_id":"$TEST_ID","seq":14,"stem":"DNA 복제(replication)의 특징으로 옳은 것은?","options":["반보존적 복제이다.","RNA primer 가 필요 없다.","한쪽 가닥만 복제된다.","항상 5\"→3\" 방향이 아니다."],"answer":"0","explanation":{"opt0":"DNA 복제는 반보존적입니다 (Meselson-Stahl 실험).","opt1":"RNA primer 가 필요합니다.","opt2":"양쪽 가닥 모두 복제됩니다.","opt3":"DNA polymerase 는 5\"→3\" 방향으로만 합성합니다."},"source_ref":null,"difficulty":3},
  {"test_id":"$TEST_ID","seq":15,"stem":"중심원리(Central Dogma)의 흐름으로 옳은 것은?","options":["RNA → DNA → 단백질","DNA → 단백질 → RNA","DNA → RNA → 단백질","단백질 → RNA → DNA"],"answer":"2","explanation":{"opt0":"역전사이며 일반적 흐름이 아닙니다.","opt1":"중간이 잘못되었습니다.","opt1":"DNA 가 RNA 로 전사되고, RNA 가 단백질로 번역되는 것이 중심원리입니다.","opt3":"방향이 거꾸로입니다."},"source_ref":null,"difficulty":1}
]
EOF
)

INSERT_RES=$(curl -s -X POST \
  "$API/exam_prep_question" \
  -H "$HK" -H "$HA" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  --data-binary "$QUESTIONS_JSON")

INSERTED_COUNT=$(echo "$INSERT_RES" | grep -o '"seq":[0-9]*' | wc -l)
echo "[INFO] inserted questions = $INSERTED_COUNT / 15"

if [ "$INSERTED_COUNT" -lt 15 ]; then
  echo "[ERROR] partial insert. response (first 800 chars):"
  echo "$INSERT_RES" | head -c 800
  exit 1
fi

echo ""
echo "[DONE] sample core test seeded for dev_02JY lecture_no=1"
echo "  test_id=$TEST_ID"
