import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useCart } from '../state/cart';
import { useCatalog, searchProducts } from '../state/catalog';
import { pos } from '../state/pos';
import { CategoryIcon } from './Icon';
import { formatMoney } from '../core/money';
import type { Product } from '../core/types';

export default function CatalogGrid() {
  const view = useCart((s) => s.view);
  const activeCategoryId = useCart((s) => s.activeCategoryId);
  const search = useCart((s) => s.search);
  const setView = useCart((s) => s.setView);
  const setSearch = useCart((s) => s.setSearch);
  const categories = useCatalog((s) => s.categories);
  const products = useCatalog((s) => s.products);
  const store = useCatalog((s) => s.store);
  const money = (n: number) => formatMoney(n, store.locale, store.currency);

  const tilesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tilesRef.current) tilesRef.current.scrollTop = 0;
  }, [view, activeCategoryId]);
  const active = categories.find((c) => c.id === activeCategoryId) ?? null;
  const items = useMemo(() => (active ? products.filter((p) => p.active && p.categoryId === active.id) : []), [products, active]);
  const results = useMemo(() => (view === 'search' ? searchProducts(search) : []), [search, view]);

  const Item = ({ p }: { p: Product }) => {
    const cat = categories.find((c) => c.id === p.categoryId);
    return (
      <button
        className={`tile tile--item ${p.stock <= p.reorderLevel ? 'is-low' : ''} ${p.soldByWeight ? 'is-kg' : ''}`}
        style={{ '--tile-color': cat?.color } as CSSProperties}
        onClick={() => void pos.addProduct(p, view === 'search' ? 'search' : 'tile')}
      >
        <span className="tile__plu">{p.plu}</span>
        <span className="tile__name">{p.name}</span>
        <span className="tile__price">
          {money(p.price)}
          {p.soldByWeight ? '/kg' : ''}
        </span>
        <span className="tile__meta">
          {p.soldByWeight ? 'weighed' : `${p.stock} in stock`}
          {p.taxable ? ' · HST' : ''}
        </span>
      </button>
    );
  };

  return (
    <section className="catalog">
      <div className="catalog__toolbar">
        {view !== 'categories' ? (
          <button className="key key--sm" onClick={() => { setView('categories', null); setSearch(''); }}>
            <ArrowLeft size={16} /> Categories
          </button>
        ) : null}
        {view === 'items' && active ? (
          <h3>
            <span className="swatch" style={{ background: active.color }} /> {active.name}
            <span className="muted" style={{ fontWeight: 500, fontSize: 12 }}>
              {active.taxable ? 'HST 13%' : 'zero-rated'} · {active.note || `${items.length} items`}
            </span>
          </h3>
        ) : (
          <div className="search">
            <Search size={16} color="#8f9cbb" />
            <input
              placeholder="Search item name, PLU or barcode…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setView(e.target.value ? 'search' : 'categories', null);
              }}
            />
            {search && (
              <button className="key key--sm key--ghost" style={{ minHeight: 30 }} onClick={() => { setSearch(''); setView('categories', null); }}>
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="tiles" ref={tilesRef}>
        {view === 'categories' &&
          categories.map((c) => (
            <button key={c.id} className="tile tile--cat" style={{ '--tile-color': c.color } as CSSProperties} onClick={() => pos.handleCategoryTap(c)}>
              <span className="tile__icon">
                <CategoryIcon name={c.icon} size={22} />
              </span>
              <span className="tile__name">{c.short}</span>
              <span className="tile__meta">{c.taxable ? 'HST' : 'no tax'}</span>
            </button>
          ))}
        {view === 'items' && items.map((p) => <Item key={p.id} p={p} />)}
        {view === 'items' && active && (
          <button className="tile tile--open" onClick={() => pos.handleCategoryTap(active)}>
            <span className="tile__name">Open price</span>
            <span className="tile__meta">type amount, then tap</span>
          </button>
        )}
        {view === 'search' && results.map((p) => <Item key={p.id} p={p} />)}
        {view === 'search' && results.length === 0 && <div className="muted" style={{ padding: 10 }}>No items match “{search}”.</div>}
      </div>
    </section>
  );
}
