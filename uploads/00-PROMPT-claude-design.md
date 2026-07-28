# PROMPT DO CLAUDE DESIGN — wizytówka Piotra Matejuka

Wklej to jako główny prompt. Dołącz do niego pliki z folderu `content/` (treść sekcji) — Claude Design użyje ich jako źródła prawdy zamiast zmyślać teksty.

---

## PROMPT (kopiuj od tej linii)

Zaprojektuj i zbuduj ultra-nowoczesną, premium stronę wizytówkową (one-pager z kotwicami + osobne podstrony tam gdzie to wskazane) dla Piotra Matejuka — hipnoterapeuty, psychotraumatologa, terapeuty psychodelicznego, autora i przedsiębiorcy. To ma wyglądać jak strona dla klienta premium: agencyjna jakość, nie firmowy szablon. Punkt odniesienia stylistycznego: strony osobiste top-tier ekspertów/autorów (edytorska typografia, dużo oddechu, mocne zdjęcie/portret w hero, minimalizm z jednym wyrazistym akcentem kolorystycznym) — nie korporacyjny "coach landing page" z ikonkami i gradientami.

### Kim jest Piotr (do hero i pozycjonowania)
Człowiek, który przez 14 lat pracował z ludzkim umysłem od strony klinicznej i przez ostatnie lata wszedł głęboko w pracę z psychodelikami — jako terapeuta, nie entuzjasta. Współtworzy szkołę, prowadzi centrum terapii, pisze książki, prowadzi festiwal, ma markę odzieżową. To nie jest "guru rozwoju osobistego" — to praktyk z dokumentacją, certyfikatami i publikacjami.

Pełna treść bio, projektów, książek, certyfikatów — w plikach `content/*.md`, użyj ich dosłownie lub jako bazy do redakcji (nie wymyślaj nowych faktów, dat, liczb czy nazw instytucji).

### Struktura strony (zakładki / sekcje)

1. **Hero** — imię i nazwisko, jedno zdanie pozycjonujące (nie hasło marketingowe, tylko trafna teza o tym kim jest), portret, CTA do kontaktu i do "poznaj projekty"
2. **O mnie** — bio, ścieżka zawodowa, wykształcenie/certyfikacje w skrócie
3. **Projekty** — 4 karty: SACRUM, Profesjonalna Szkoła Hipnoterapii, CIEŃ Festiwal, Egoisn't — każda z linkiem wyjściowym do właściwej domeny
4. **Terapia psychodeliczna** — certyfikaty i afiliacje (MAPS, Center for Medicinal Mindfulness, Psychedelic Shine, DMTx), czym się różni jego podejście (kliniczne, nie duchowo-rekreacyjne)
5. **Książki** — "Autohipnoza: Bliskie spotkania z samym sobą" (wydana, link do zakupu na Sensus) + zapowiedź drugiej książki o hipnozie klinicznej (w przygotowaniu, bez ujawniania szczegółów których nie mamy)
6. **Warsztaty i szkolenia** — trener hipnoterapii, organizator warsztatów, wystąpienia (SUM, UJ, konferencje)
7. **Mentoring 1:1** — płatny mentoring terapeutyczno-rozwojowy z Piotrem (NIE terapia — patrz zasady niżej), cennik: sesja 1,5h / 1200 zł, pakiet 10 sesji / 9700 zł, online lub gabinet Warszawa ul. Klaudyny 34C
8. **Kontakt** — formularz (współpraca/media/szkolenia/mentoring) + linki social, BEZ zapisów na terapię

### Ważne rozgraniczenie: terapia vs. reszta strony
Ta wizytówka **nie prowadzi terapii i nie zbiera zapisów na terapię**. Każde miejsce, gdzie mogłaby pojawić się pokusa dodania CTA "umów terapię", ma zamiast tego link wyjściowy do **sacrum.life** (Centrum Terapii Psychodelicznych SACRUM — tam faktycznie odbywa się praca terapeutyczna). Jedyna usługa sprzedawana bezpośrednio na tej stronie to **mentoring terapeutyczno-rozwojowy 1:1** (sekcja 7) — jednoznacznie odróżniony w treści jako praca rozwojowa, nie terapia kliniczna.

### Kierunek wizualny
- Paleta: głęboka czerń/antracyt + ciepły offwhite/kremowy + jeden akcent (stonowana zieleń butelkowa lub głęboki bursztyn/terracotta — coś co czuje się klinicznie a nie new-age)
- Typografia: elegancki serif edytorski na nagłówkach (np. w duchu Fraunces/Canela/Freight) + czysty grotesk na treści (Inter/Söhne)
- Dużo białej przestrzeni, duże marginesy, sekcje oddzielone pełnoekranowymi przełamaniami (nie ciasny "landing page stack")
- Zdjęcia: pełnoekranowe/duże, czarno-białe lub stonowane kolorystycznie, żadnych stockowych uśmiechów — powaga i obecność
- Mikrointerakcje: subtelne, fade/reveal przy scrollu, bez efekciarstwa
- Zero ikon-emoji, zero gradientowych "blob" tła, zero typowego SaaS-landing feel
- Mobile-first, w pełni responsywna

### Techniczne
- Next.js + Tailwind (albo czysty semantyczny HTML/CSS jeśli Claude Design generuje statycznie) — zgodnie z tym, co Claude Design domyślnie produkuje
- SEO: meta title/description per sekcja, Open Graph z portretem
- Szybkość: brak ciężkich bibliotek, obrazy zoptymalizowane
- Formularz kontaktowy: prosty POST do wskazanego endpointu (placeholder, podłączymy realny backend później) — nie generuj fałszywego "wysłano" bez faktycznego wywołania

### Czego NIE robić
- Nie zmyślaj liczb, dat, nazw instytucji, cytatów pacjentów — jeśli czegoś nie ma w plikach `content/`, zostaw miejsce/placeholder i zaznacz to wyraźnie zamiast wypełniać fikcją
- Nie używaj języka coachingowego ("odkryj swój potencjał", "transformacja życia") — ton ma być kliniczny, konkretny, bez lania wody
- Nie kopiuj identycznej stylistyki żadnego z istniejących projektów Piotra (SACRUM ma swój branding, to ma być odrębna, osobista wizytówka)

---

## Jak używać tego pakietu
1. Otwórz Claude Design, wklej powyższy prompt.
2. Dołącz (upload / wklej zawartość) pliki z `content/`:
   - `01-o-mnie.md`
   - `02-projekty.md`
   - `03-terapia-psychodeliczna.md`
   - `04-ksiazki.md`
   - `05-warsztaty-szkolenia.md`
   - `06-kontakt.md`
   - `07-mentoring.md`
3. Po pierwszym renderze — daj feedback iteracyjnie sekcja po sekcji, nie wszystko naraz.
