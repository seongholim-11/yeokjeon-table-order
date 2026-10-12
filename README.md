# 역전할머니맥주 테이블오더

## GitHub Pages 배포

`docs/`에는 서버 없이 브라우저에서 실행되는 정적 웹 버전이 있습니다.
메뉴, 옵션, 장바구니, 주문내역, 직원 호출 데모, AI 추천 조합과 룰렛을 지원합니다.
데이터는 브라우저 탭의 `sessionStorage`에 저장되며 실제 주문이나 호출은 전송되지 않습니다.

Python 메뉴 데이터나 기존 CSS를 수정했다면 다음 명령으로 정적 데이터를 다시 생성하세요.

```powershell
python build_pages.py
python -m http.server 8080 --directory docs
```

GitHub 저장소의 Settings → Pages에서 `main` 브랜치와 `/docs` 폴더를 선택하면 배포됩니다.
배포 URL: https://seongholim-11.github.io/yeokjeon-table-order/

## Streamlit 데모

티오더 스타일의 테이블 오더 데모 앱입니다. 손님이 테이블에서 메뉴를 고르고, 장바구니에 담아 주문하고, 직원을 호출할 수 있습니다. 주문 내역에 맞춰 안주 조합을 추천하는 AI 추천 기능도 있습니다. 모든 데이터는 더미 데이터입니다.

## 주요 기능

- **메뉴 탐색**: 인기메뉴, 치킨·튀김, 안주, 탕·전골, 맥주, 소주·막걸리, 음료·사이드 카테고리
- **장바구니·주문**: 옵션 선택, 수량 조절, 주문 내역 확인
- **직원 호출**: 물, 앞접시 등 자주 쓰는 요청 전달
- **AI 추천 조합**: 인원, 예산, 맵기, 주종을 입력하면 안주 조합을 최대 3개 추천합니다. 이미 주문한 메뉴가 있으면 이를 반영하고, 세트 구성 시 10% 할인을 적용합니다. 예산과 품절, 맵기 조건은 항상 지킵니다.
- 모바일과 데스크톱 화면 모두 지원

## 기술 스택

- Python 3
- [Streamlit](https://streamlit.io/) 1.65 이상 2 미만
- 커스텀 CSS ([app.css](app.css))

## 설치 및 실행

```powershell
# 1. 가상환경 생성 및 활성화 (선택)
python -m venv .venv
.venv\Scripts\activate

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 앱 실행
streamlit run app.py
```

실행하면 브라우저에서 `http://localhost:8501`로 접속할 수 있습니다.

## 테스트

```powershell
python -m unittest test_recommendations -v
```

## 폴더 구조

```
p1/
├── app.py                    # Streamlit 메인 앱 (화면, 세션 상태, 장바구니)
├── app.css                   # 앱 스타일
├── menu_data.py              # 매장 정보, 카테고리, 메뉴 더미 데이터
├── recommendations.py        # 조합 추천 및 세트 가격 계산
├── test_recommendations.py   # 추천 로직 테스트
├── requirements.txt          # 의존성 목록
├── .streamlit/config.toml    # Streamlit 설정
└── ui-review/                # UI 검토용 스크린샷
```

## 참고

- 결제, 서버 저장, 실제 직원 호출 연동은 없습니다. 주문과 호출은 세션 안에서만 유지됩니다.
- 매장 정보(역전할머니맥주 강남역점, 30개 테이블)와 메뉴는 데모용 가상 데이터입니다.
