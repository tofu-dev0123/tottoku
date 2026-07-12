import {
  AlertCircle,
  ArrowRight,
  Bell,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  FileText,
  Folder,
  FolderPlus,
  FolderTree,
  History,
  Home,
  Inbox,
  KeyRound,
  Lock,
  Search,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

// 公開ランディングページ(画面外・認証不要)。
// 目的: リポジトリを公開し「使いたい人が README を見て自分で構築する」ための紹介ページ。
// middleware が無いため、このルートは allowlist を通らず誰でも閲覧できる。
// デザインは実装トーン(白 × blue-700・角丸 lg/xl/2xl)に合わせ、実画面をモックで並べる。

const REPO_URL = "https://github.com/tofu-dev0123/tottoku";

export const metadata: Metadata = {
  title: "トットク — 家族の書類を、大切にとっておく",
  description:
    "家庭の契約書や子供の教育書類を安全に管理するセルフホスト型の家族向け書類管理アプリ。Next.js + S3 + PostgreSQL。ソースは公開、README を見て自分で構築できます。",
  openGraph: {
    title: "トットク — 家族の書類を、大切にとっておく",
    description:
      "家庭の書類を安全に管理するセルフホスト型アプリ。ソースは公開、自分で構築して使えます。",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white [font-family:var(--font-geist-sans),system-ui,sans-serif] text-gray-900">
      <NavBar />
      <Hero />
      <ScreenShowcase />
      <Features />
      <TechStack />
      <SelfHost />
      <Footer />
    </div>
  );
}

/* ---------- ナビ ---------- */

function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Image
          src="/tottoku.png"
          alt="トットク"
          width={745}
          height={280}
          priority
          className="h-7 w-auto select-none"
        />
        <nav className="flex items-center gap-2 sm:gap-4">
          <a
            href="#features"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:block"
          >
            特徴
          </a>
          <a
            href="#stack"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:block"
          >
            技術スタック
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <GithubGlyph className="size-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

/* ---------- ヒーロー ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-white"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-blue-100/50 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-700">
          <ShieldCheck className="size-3.5" />
          セルフホスト型・家族専用
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-tight font-bold tracking-tight text-gray-900 sm:text-6xl">
          家族の大事な書類を、
          <br className="hidden sm:block" />
          <span className="text-blue-700">大切にとっておく。</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
          契約書・保険証券・子供の教育書類—— 家庭に散らばる大事な紙を、探しやすく安全に。
          ソースは公開しているので、README を見て自分の環境に構築して使えます。
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={`${REPO_URL}#readme`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition-colors hover:bg-blue-800 sm:w-auto"
          >
            構築手順を見る（README）
            <ArrowRight className="size-4" />
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            <GithubGlyph className="size-4" />
            リポジトリを見る
          </a>
        </div>
        <p className="mt-5 text-xs text-gray-400">
          ※ 公開ホスティングはしていません。各自でデプロイして利用します。
        </p>
      </div>
    </section>
  );
}

/* ---------- 実画面モック ---------- */

function ScreenShowcase() {
  return (
    <section className="bg-gray-50 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            スマホでも PC でも
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            外出先ではスマホでサッと。整理は PC のファイラーでじっくり。
            同じデータを画面に合わせて最適に表示します。
          </p>
        </div>

        <div className="mt-14 flex flex-col items-center gap-10 lg:flex-row lg:items-end lg:justify-center">
          <PhoneFrame>
            <LoginMock />
          </PhoneFrame>
          <PhoneFrame featured>
            <HomeMock />
          </PhoneFrame>
        </div>

        <div className="mt-12 flex justify-center">
          <DesktopFrame>
            <FilerMock />
          </DesktopFrame>
        </div>
      </div>
    </section>
  );
}

function PhoneFrame({
  children,
  featured = false,
}: {
  children: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-[2.5rem] border-[6px] border-gray-900 bg-gray-900 shadow-2xl ${
        featured ? "w-[270px] lg:mb-8" : "w-[250px]"
      }`}
    >
      <div className="relative overflow-hidden rounded-[2rem] bg-gray-50">
        <div className="absolute top-2 left-1/2 z-10 h-4 w-24 -translate-x-1/2 rounded-full bg-gray-900" />
        <div className="h-[540px] overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function LoginMock() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50 px-5">
      <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 pt-9 pb-6 text-center">
          <Image
            src="/tottoku.png"
            alt="とっとく"
            width={745}
            height={280}
            className="mx-auto h-auto w-36 select-none"
          />
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            家族の大事な書類を、
            <br />
            大切にとっておく。
          </p>
        </div>
        <div className="px-6 pb-4">
          <div className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-800">
            <GoogleGlyph />
            Google でログイン
          </div>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-gray-400">
            登録された家族だけがログインできます
          </p>
        </div>
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
          <p className="text-center text-[10px] leading-relaxed text-gray-500">
            書類は暗号化して保管され、家族以外はアクセスできません
          </p>
        </div>
      </div>
    </div>
  );
}

function HomeMock() {
  const items = [
    { title: "自動車保険 証券", left: 9, urgent: true },
    { title: "こども医療費受給者証", left: 42, urgent: false },
  ];
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[13px] text-gray-500">おかえりなさい</p>
          <p className="mt-0.5 text-lg font-medium text-gray-900">わが家の書類</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white">
          み
        </div>
      </header>

      <div className="px-5">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-gray-400">
          <Search className="size-4" />
          <span className="text-sm">書類を検索</span>
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">期限が近い書類</span>
          <span className="text-xs text-blue-700">すべて見る</span>
        </div>
        <ul className="space-y-2">
          {items.map((d) => (
            <li
              key={d.title}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                d.urgent ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {d.urgent ? (
                <AlertCircle className="size-6 shrink-0" />
              ) : (
                <Clock className="size-6 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{d.title}</p>
                <p className="mt-0.5 text-xs">期限まで あと {d.left}日</p>
              </div>
              <ChevronRight className="size-4 shrink-0" />
            </li>
          ))}
        </ul>
      </div>

      <nav className="mt-auto flex items-end justify-around border-t border-gray-200 bg-white px-2 pt-2 pb-2">
        <MockTab icon={<Home className="size-5" />} label="ホーム" active />
        <MockTab icon={<Folder className="size-5" />} label="フォルダ" />
        <div className="flex flex-1 flex-col items-center text-gray-500">
          <span className="-mt-6 flex size-12 items-center justify-center rounded-full bg-blue-700 text-white shadow-md ring-4 ring-gray-50">
            <Camera className="size-6" />
          </span>
          <span className="mt-0.5 text-[10px]">追加</span>
        </div>
        <MockTab icon={<Bell className="size-5" />} label="通知" />
        <MockTab icon={<Settings className="size-5" />} label="設定" />
      </nav>
    </div>
  );
}

function MockTab({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-0.5 ${active ? "text-blue-700" : "text-gray-400"}`}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </div>
  );
}

function DesktopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <span className="size-3 rounded-full bg-red-400" />
        <span className="size-3 rounded-full bg-amber-400" />
        <span className="size-3 rounded-full bg-green-400" />
        <span className="ml-3 rounded-md bg-white px-3 py-1 text-[11px] text-gray-400 ring-1 ring-gray-200">
          tottoku.example.com
        </span>
      </div>
      {children}
    </div>
  );
}

const FILER_GRID = "grid grid-cols-[1fr_120px_64px_100px_92px_36px] items-center";

function FilerMock() {
  const folders = ["保険", "住まい・車", "子ども", "健康・医療", "契約・行政"];
  const folderRows = [
    { name: "保険", count: 4 },
    { name: "子ども", count: 6 },
  ];
  const docRows = [
    {
      title: "自動車保険 証券",
      folder: "保険",
      date: "2025/06/12",
      expiry: { label: "あと9日", urgent: true },
    },
    { title: "賃貸借契約書", folder: "住まい・車", date: "2025/04/03", expiry: null },
    {
      title: "こども医療費受給者証",
      folder: "子ども",
      date: "2025/03/21",
      expiry: { label: "あと42日", urgent: false },
    },
    { title: "健康診断結果 2025", folder: "健康・医療", date: "2025/02/18", expiry: null },
    { title: "確定申告 控え", folder: "未分類", date: "2025/03/15", expiry: null },
    {
      title: "火災保険 証券",
      folder: "保険",
      date: "2025/01/09",
      expiry: { label: "期限切れ", urgent: true },
    },
  ];

  return (
    <div className="flex h-[440px] bg-white text-gray-900">
      {/* サイドバー */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-[#f1f2f4] p-3 sm:flex">
        <div className="px-2 py-2">
          <Image
            src="/tottoku-gray.png"
            alt="トットク"
            width={751}
            height={283}
            className="h-7 w-auto select-none"
          />
        </div>

        <p className="px-2 pt-3 pb-1 text-[11px] font-semibold text-gray-400">よく使う項目</p>
        <nav className="space-y-0.5">
          <MockSideItem icon={<Home className="size-4" />} label="ホーム" active />
          <MockSideItem
            icon={<Clock className="size-4" />}
            label="期限が近い"
            badge={2}
            badgeAmber
          />
          <MockSideItem icon={<Inbox className="size-4" />} label="未分類" badge={1} />
          <MockSideItem icon={<History className="size-4" />} label="最近追加" />
        </nav>

        <p className="px-2 pt-4 pb-1 text-[11px] font-semibold text-gray-400">フォルダ</p>
        <nav className="space-y-0.5">
          {folders.map((f) => (
            <MockSideItem key={f} icon={<Folder className="size-4" />} label={f} />
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-200 pt-2">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-blue-700 text-xs font-semibold text-white">
              み
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">みさき</p>
              <p className="truncate text-[11px] text-gray-400">family@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* メイン */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ツールバー */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2.5">
          <div className="flex text-gray-400">
            <span className="flex size-7 items-center justify-center rounded-md">
              <ChevronLeft className="size-4" />
            </span>
            <span className="flex size-7 items-center justify-center rounded-md">
              <ChevronRight className="size-4" />
            </span>
          </div>
          <nav className="flex items-center gap-1 text-[15px] font-semibold">
            <span>わが家の書類</span>
          </nav>
          <div className="flex-1" />
          <div className="flex w-56 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-400">
            <Search className="size-4" />
            <span className="text-xs">検索</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-gray-800">
            <FolderPlus className="size-4" />
            新規フォルダ
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-[13px] font-semibold text-white">
            <Upload className="size-4" />
            書類を追加
          </span>
        </div>

        {/* リスト */}
        <div className="flex-1 overflow-hidden">
          <div
            className={`${FILER_GRID} border-b border-gray-200 bg-white px-5 py-2 text-xs text-gray-500`}
          >
            <div>名前</div>
            <div>フォルダ</div>
            <div>件数</div>
            <div>追加日</div>
            <div className="text-right">期限</div>
            <div />
          </div>

          {folderRows.map((f) => (
            <div key={f.name} className={`${FILER_GRID} border-b border-gray-100 px-5 py-2.5`}>
              <span className="flex items-center gap-3">
                <Folder className="size-5 text-blue-700" />
                <span className="font-medium">{f.name}</span>
              </span>
              <span className="text-gray-400">—</span>
              <span className="text-gray-500">{f.count}件</span>
              <span className="text-gray-400">—</span>
              <span className="text-right text-gray-400">—</span>
              <span />
            </div>
          ))}

          {docRows.map((d) => (
            <div key={d.title} className={`${FILER_GRID} border-b border-gray-100 px-5 py-2.5`}>
              <span className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-gray-400" />
                <span className="truncate font-medium">{d.title}</span>
              </span>
              <span className="truncate text-[13px] text-gray-500">{d.folder}</span>
              <span className="text-gray-400">—</span>
              <span className="text-gray-500">{d.date}</span>
              <span className="text-right">
                {d.expiry ? (
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      d.expiry.urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {d.expiry.label}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </span>
              <span />
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 px-5 py-1.5 text-xs text-gray-500">
          {folderRows.length} フォルダ・{docRows.length} 書類
        </div>
      </div>
    </div>
  );
}

function MockSideItem({
  icon,
  label,
  active = false,
  badge,
  badgeAmber = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  badgeAmber?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
        active ? "bg-blue-100 text-blue-800" : "text-gray-700"
      }`}
    >
      <span className="text-blue-700">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className={`min-w-5 rounded-full px-1.5 text-center text-[11px] text-white ${
            badgeAmber ? "bg-amber-500" : "bg-gray-400"
          }`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/* ---------- 特徴 ---------- */

const FEATURES = [
  {
    icon: FolderTree,
    title: "フォルダは「階層タグ」",
    body: "物理ディレクトリではなくメタデータ上の階層。1つの書類を複数のフォルダに同時に置けて、後からの組み替えも安全です。",
  },
  {
    icon: FileText,
    title: "入力は最小限",
    body: "保存時の必須は「タイトル」と「保存先フォルダ」の2つだけ。撮る／選ぶ → さっと保存。メモや期限は任意で。",
  },
  {
    icon: Bell,
    title: "期限リマインド",
    body: "保険や資格の有効期限を登録しておけば、期限が近い書類をホームでひと目に。うっかり失効を防ぎます。",
  },
  {
    icon: Cloud,
    title: "実体は S3 に安全保管",
    body: "ファイルはパブリックアクセス全ブロックの S3 に暗号化保存。到達は必ず短命の署名付き URL 経由に限定します。",
  },
  {
    icon: Lock,
    title: "家族だけの allowlist",
    body: "Google ログイン＋許可リスト。登録した家族のメールアドレスだけがアクセスでき、一般には公開しません。",
  },
  {
    icon: Search,
    title: "探しやすさ重視",
    body: "タイトルの部分一致検索とフォルダ・タグでの多軸絞り込み。散らばりがちな家庭の書類をすばやく見つけられます。",
  },
];

function Features() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            とっとくの考えかた
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            「あの書類どこだっけ？」をなくすための、小さくて堅実な設計。
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 技術スタック ---------- */

const STACK = [
  { label: "フロント / API", value: "Next.js 16 (App Router)" },
  { label: "UI", value: "React 19 + Tailwind CSS v4" },
  { label: "言語", value: "TypeScript" },
  { label: "認証", value: "Auth.js + Google + allowlist" },
  { label: "ストレージ", value: "Amazon S3（非公開・SSE）" },
  { label: "DB", value: "PostgreSQL + Drizzle ORM" },
  { label: "ホスティング", value: "Vercel" },
  { label: "インフラ", value: "CloudFormation" },
];

function TechStack() {
  return (
    <section id="stack" className="bg-gray-900 py-20 text-white sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">技術スタック</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-400 sm:text-base">
            モダンでサーバーレスな構成。運用コストは小さく、個人でも無理なく維持できます。
          </p>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-medium tracking-wide text-blue-300">{s.label}</p>
              <p className="mt-1.5 text-sm font-medium text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- セルフホスト案内 ---------- */

const STEPS = [
  {
    icon: GithubGlyph,
    title: "リポジトリを取得",
    body: "GitHub から clone。開発環境は nix flake（Node 22 + pnpm）で再現できます。",
  },
  {
    icon: KeyRound,
    title: "リソースを用意",
    body: "Google OAuth・Neon（PostgreSQL）・S3 と IAM（CloudFormation）を作成し、環境変数を設定。",
  },
  {
    icon: Cloud,
    title: "デプロイして使う",
    body: "DB マイグレーションを流し、Vercel にデプロイ。allowlist に家族のメールを登録すれば準備完了。",
  },
];

function SelfHost() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-4xl px-5">
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-8 sm:p-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              使ってみたい方へ
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
              トットクは公開サービスではなく
              <strong className="text-gray-900">公開リポジトリ</strong>です。
              ソースは自由に使えます。README
              の手順に沿って、自分のクラウド環境に構築してご利用ください。
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-700 text-sm font-semibold text-white">
                    {i + 1}
                  </div>
                  <s.icon className="size-4 text-blue-700" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <a
              href={`${REPO_URL}#readme`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition-colors hover:bg-blue-800"
            >
              README で構築手順を読む
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- フッター ---------- */

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row">
        <div className="flex items-center gap-3">
          <Image
            src="/tottoku.png"
            alt="トットク"
            width={745}
            height={280}
            className="h-6 w-auto select-none"
          />
          <span className="text-xs text-gray-400">家族の書類を、大切にとっておく。</span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
          >
            <GithubGlyph className="size-4" />
            GitHub
          </a>
        </div>
      </div>
      <p className="pb-8 text-center text-[11px] text-gray-400">
        個人開発プロジェクト。公開ホスティングはしていません。
      </p>
    </footer>
  );
}

function GithubGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
