import { Apple, Beef, Candy, Carrot, Croissant, CupSoda, Egg, House, Luggage, Milk, Shirt, ShoppingBasket, Snowflake, Sparkles, ToyBrick, Watch, Tag, type LucideProps } from 'lucide-react';

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  'shopping-basket': ShoppingBasket,
  candy: Candy,
  'cup-soda': CupSoda,
  beef: Beef,
  apple: Apple,
  carrot: Carrot,
  milk: Milk,
  egg: Egg,
  snowflake: Snowflake,
  croissant: Croissant,
  sparkles: Sparkles,
  shirt: Shirt,
  luggage: Luggage,
  'toy-brick': ToyBrick,
  watch: Watch,
  house: House,
};

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const C = MAP[name] ?? Tag;
  return <C {...props} />;
}

export function EagleMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0b1220" />
      <path d="M32 12c-3 8-10 13-20 14 6 3 10 8 11 14l9-7 9 7c1-6 5-11 11-14-10-1-17-6-20-14z" fill="#f5b300" />
      <circle cx="32" cy="46" r="4" fill="#f5b300" />
    </svg>
  );
}
