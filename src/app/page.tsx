export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal">
        India Market Intelligence
      </p>
      <h1 className="text-center text-5xl font-semibold text-foreground sm:text-6xl">
        Indo <span className="text-saffron">Touch</span>
      </h1>
      <p className="max-w-md text-center text-lg leading-relaxed text-foreground/70">
        인도 화장품 시장 데일리 인텔리전스 대시보드가 준비 중입니다. 매일 아침
        5개 카테고리의 뉴스와 소비자 보이스가 이곳에 도착합니다.
      </p>
    </main>
  );
}
