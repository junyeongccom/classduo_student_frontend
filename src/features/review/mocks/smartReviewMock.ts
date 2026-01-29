export type SmartReviewFlashcard = {
  id: string
  term: string
  definition: string
}

export const SMART_REVIEW_FLASHCARDS: SmartReviewFlashcard[] = [
  {
    id: 'flashcard-1',
    term: '유전적 변이 (Genetic Variant)',
    definition: 'DNA 서열에서 나타나는 변이. 돌연변이와 유사하게 사용되기도 함.',
  },
  {
    id: 'flashcard-2',
    term: 'Achondroplasia (연골무형성증)',
    definition: '뼈 성장에 영향을 미치는 유전 질환으로, 불균형적 사지 성장을 유발함.',
  },
  {
    id: 'flashcard-3',
    term: 'Allele (대립유전자)',
    definition: '특정 유전자좌에서 나타나는 유전적 변이의 형태.',
  },
  {
    id: 'flashcard-4',
    term: 'De Novo 변이',
    definition: '부모에게는 없고 자손에게 새로 발생한 유전적 변이.',
  },
  {
    id: 'flashcard-5',
    term: 'FGFR3',
    definition: '뼈 성장을 조절하는 단백질을 암호화하며 연골무형성증과 연관됨.',
  },
  {
    id: 'flashcard-6',
    term: 'G380R 변이',
    definition: 'FGFR3 유전자에서 글리신이 아르기닌으로 치환되는 돌연변이.',
  },
  {
    id: 'flashcard-7',
    term: 'Missense 변이 (미스센스 변이)',
    definition: '아미노산이 다른 아미노산으로 바뀌는 변이.',
  },
  {
    id: 'flashcard-8',
    term: 'Nonsense 변이 (넌센스 변이)',
    definition: 'stop 코돈으로 바뀌어 단백질이 조기 종료되는 변이.',
  },
  {
    id: 'flashcard-9',
    term: 'Polygenic (다유전자)',
    definition: '하나의 형질이 여러 유전자에 의해 영향을 받는 것.',
  },
  {
    id: 'flashcard-10',
    term: 'Synonymous/Silent 변이 (동의/침묵 변이)',
    definition: 'DNA 서열 변화가 있어도 아미노산 서열은 변하지 않는 변이.',
  },
]

