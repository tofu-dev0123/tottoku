import { User } from "lucide-react";
import Image from "next/image";

// アカウントアバター。Google のプロフィール画像があれば表示し、無ければ User アイコンにフォールバック。
export function Avatar({
  image,
  name,
  px,
  sizeClassName,
  iconClassName,
}: {
  image?: string | null;
  name?: string;
  px: number;
  sizeClassName: string;
  iconClassName: string;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name || "アカウント"}
        title={name || undefined}
        width={px}
        height={px}
        className={`${sizeClassName} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      title={name || undefined}
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700`}
    >
      <User className={iconClassName} />
    </span>
  );
}
