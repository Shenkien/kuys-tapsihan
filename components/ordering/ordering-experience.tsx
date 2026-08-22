"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Flame,
  Sparkles,
  UtensilsCrossed,
  Gift,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useCart, type CartAddOn } from "./use-cart";
import { LanguageProvider, useLanguage } from "./language-context";
import type { TranslationKey } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isBestSeller: boolean;
  isNew: boolean;
  categoryId: string;
}

export interface PublicCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface PublicAddOn {
  id: string;
  name: string;
  price: number;
}

export interface PublicComboMeal {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  items: { quantity: number; menuItem: { id: string; name: string; price: number } }[];
}

type View = "menu" | "checkout" | "confirmation";

const COMBOS_TAB = "__combos__";

const PAYMENT_METHODS: { value: "CASH" | "GCASH" | "MAYA" | "CARD"; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "CARD", label: "Card" },
];

const STATUS_KEYS: Record<string, { label: TranslationKey; description: TranslationKey }> = {
  PENDING: { label: "status_pending_label", description: "status_pending_desc" },
  CONFIRMED: { label: "status_confirmed_label", description: "status_confirmed_desc" },
  PREPARING: { label: "status_preparing_label", description: "status_preparing_desc" },
  READY: { label: "status_ready_label", description: "status_ready_desc" },
  COMPLETED: { label: "status_completed_label", description: "status_completed_desc" },
  CANCELLED: { label: "status_cancelled_label", description: "status_cancelled_desc" },
};

// ---------------------------------------------------------------------------

export function OrderingExperience({
  channel,
  tableToken,
  tableNumber,
  categories,
  menuItems,
  addOns,
  comboMeals,
}: {
  channel: "KIOSK" | "QR";
  tableToken?: string;
  tableNumber?: string;
  categories: PublicCategory[];
  menuItems: PublicMenuItem[];
  addOns: PublicAddOn[];
  comboMeals: PublicComboMeal[];
}) {
  const storageKey = channel === "QR" ? `cart:qr:${tableToken}` : "cart:kiosk";
  const cart = useCart(storageKey);

  const [view, setView] = useState<View>("menu");
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [cartOpen, setCartOpen] = useState(false);
  const [pickerItem, setPickerItem] = useState<PublicMenuItem | null>(null);

  const itemsInActiveCategory = useMemo(
    () => menuItems.filter((m) => m.categoryId === activeCategoryId),
    [menuItems, activeCategoryId]
  );

  const [confirmedOrder, setConfirmedOrder] = useState<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    estimatedMinutes: number;
  } | null>(null);

  function handleOrderPlaced(order: { id: string; orderNumber: string; totalAmount: number }) {
    const estimatedMinutes = Math.min(25, 8 + cart.items.length * 3);
    cart.clear();
    setConfirmedOrder({ ...order, estimatedMinutes });
    setView("confirmation");
    setCartOpen(false);
  }

  function handleStartOver() {
    setConfirmedOrder(null);
    setView("menu");
  }

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <Header
          channel={channel}
          tableNumber={tableNumber}
          itemCount={cart.itemCount}
          onCartClick={() => setCartOpen(true)}
          showCartButton={view === "menu"}
        />

        {view === "menu" && (
          <>
            <CategoryTabs
              categories={categories}
              activeCategoryId={activeCategoryId}
              onSelect={setActiveCategoryId}
              showCombosTab={comboMeals.length > 0}
            />
            {activeCategoryId === COMBOS_TAB ? (
              <ComboGrid combos={comboMeals} cart={cart} />
            ) : (
              <MenuGrid items={itemsInActiveCategory} addOns={addOns} cart={cart} onCustomize={setPickerItem} />
            )}
          </>
        )}

        {view === "checkout" && (
          <CheckoutView
            channel={channel}
            tableToken={tableToken}
            cart={cart}
            onBack={() => setView("menu")}
            onPlaced={handleOrderPlaced}
          />
        )}

        {view === "confirmation" && confirmedOrder && (
          <ConfirmationView order={confirmedOrder} channel={channel} onStartOver={handleStartOver} />
        )}

        {cartOpen && view === "menu" && (
          <CartPanel
            cart={cart}
            onClose={() => setCartOpen(false)}
            onCheckout={() => {
              setCartOpen(false);
              setView("checkout");
            }}
          />
        )}

        {pickerItem && (
          <AddOnPicker
            item={pickerItem}
            addOns={addOns}
            onClose={() => setPickerItem(null)}
            onConfirm={(quantity, selected) => {
              cart.addItem(
                { menuItemId: pickerItem.id, name: pickerItem.name, price: pickerItem.price, imageUrl: pickerItem.imageUrl },
                quantity,
                selected
              );
              setPickerItem(null);
            }}
          />
        )}
      </div>
    </LanguageProvider>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({
  channel,
  tableNumber,
  itemCount,
  onCartClick,
  showCartButton,
}: {
  channel: "KIOSK" | "QR";
  tableNumber?: string;
  itemCount: number;
  onCartClick: () => void;
  showCartButton: boolean;
}) {
  const { lang, setLang, t } = useLanguage();

  const tagline =
    channel === "KIOSK"
      ? t("tagline_kiosk")
      : tableNumber
        ? t("tagline_qr_table", { table: tableNumber })
        : t("tagline_qr_generic");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <p className="font-display text-lg font-bold leading-tight">KUY&apos;S Tapsihan</p>
          <p className="text-xs text-muted-foreground">{tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border bg-background p-0.5 text-xs font-semibold shadow-sm">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "rounded-full px-2.5 py-1 transition",
                lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLang("fil")}
              className={cn(
                "rounded-full px-2.5 py-1 transition",
                lang === "fil" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              FIL
            </button>
          </div>
          {showCartButton && (
            <button
              onClick={onCartClick}
              className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              <ShoppingCart className="h-4 w-4" />
              {t("cart")}
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">
                  {itemCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Category tabs
// ---------------------------------------------------------------------------

function CategoryTabs({
  categories,
  activeCategoryId,
  onSelect,
  showCombosTab,
}: {
  categories: PublicCategory[];
  activeCategoryId: string;
  onSelect: (id: string) => void;
  showCombosTab: boolean;
}) {
  const { t } = useLanguage();
  if (categories.length === 0 && !showCombosTab) return null;
  return (
    <div className="sticky top-[57px] z-20 border-b border-border bg-background/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {showCombosTab && (
          <button
            onClick={() => onSelect(COMBOS_TAB)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition",
              activeCategoryId === COMBOS_TAB
                ? "border-primary bg-primary text-primary-foreground"
                : "border-accent bg-accent/20 text-foreground hover:bg-accent/30"
            )}
          >
            <Gift className="h-3.5 w-3.5" />
            {t("combos")}
          </button>
        )}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition",
              activeCategoryId === cat.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-secondary"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu grid
// ---------------------------------------------------------------------------

function MenuGrid({
  items,
  addOns,
  cart,
  onCustomize,
}: {
  items: PublicMenuItem[];
  addOns: PublicAddOn[];
  cart: ReturnType<typeof useCart>;
  onCustomize: (item: PublicMenuItem) => void;
}) {
  const { t } = useLanguage();
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center text-muted-foreground">
        {t("no_items_category")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const line = cart.items.find((l) => l.key === item.id);
          const hasAddOns = addOns.length > 0;
          return (
            <div
              key={item.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md"
            >
              <div className="relative flex h-36 items-center justify-center bg-muted">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="400px" />
                ) : (
                  <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40" />
                )}
                {(item.isBestSeller || item.isNew) && (
                  <div className="absolute left-2 top-2 flex gap-1">
                    {item.isBestSeller && (
                      <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground shadow-sm">
                        <Flame className="h-3 w-3" /> {t("best_seller")}
                      </span>
                    )}
                    {item.isNew && (
                      <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                        <Sparkles className="h-3 w-3" /> {t("new_badge")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display font-semibold">{item.name}</h3>
                {item.description && (
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{item.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display font-bold text-primary">{formatCurrency(item.price)}</span>

                  {!line ? (
                    <button
                      onClick={() =>
                        hasAddOns
                          ? onCustomize(item)
                          : cart.addItem({ menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl })
                      }
                      className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("add")}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-1 py-1 shadow-sm">
                      <button
                        onClick={() => cart.updateQuantity(item.id, line.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-foreground transition hover:bg-secondary"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-4 text-center text-sm font-semibold">{line.quantity}</span>
                      <button
                        onClick={() => cart.updateQuantity(item.id, line.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-foreground transition hover:bg-secondary"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {hasAddOns && (
                  <button
                    onClick={() => onCustomize(item)}
                    className="mt-2 self-start text-xs font-medium text-primary transition hover:underline"
                  >
                    {t("add_extras")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Combo meals grid
// ---------------------------------------------------------------------------

function ComboGrid({ combos, cart }: { combos: PublicComboMeal[]; cart: ReturnType<typeof useCart> }) {
  const { t } = useLanguage();
  if (combos.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center text-muted-foreground">
        {t("no_combos")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {combos.map((combo) => {
          const key = `combo:${combo.id}`;
          const line = cart.items.find((l) => l.key === key);
          const regularTotal = combo.items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
          const savings = Math.max(0, Math.round((regularTotal - combo.price) * 100) / 100);

          return (
            <div
              key={combo.id}
              className="flex flex-col overflow-hidden rounded-xl border border-accent/60 bg-card shadow-sm transition hover:shadow-md"
            >
              <div className="relative flex h-36 items-center justify-center bg-accent/10">
                {combo.imageUrl ? (
                  <Image src={combo.imageUrl} alt={combo.name} fill className="object-cover" sizes="400px" />
                ) : (
                  <Gift className="h-10 w-10 text-accent-foreground/40" />
                )}
                {savings > 0 && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground shadow-sm">
                    Save {formatCurrency(savings)}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display font-semibold">{combo.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Includes: {combo.items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.menuItem.name}` : i.menuItem.name)).join(", ")}
                </p>
                {combo.description && (
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{combo.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="font-display font-bold text-primary">{formatCurrency(combo.price)}</span>
                    {savings > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground line-through">{formatCurrency(regularTotal)}</span>
                    )}
                  </div>

                  {!line ? (
                    <button
                      onClick={() =>
                        cart.addItem({ comboMealId: combo.id, name: combo.name, price: combo.price, imageUrl: combo.imageUrl })
                      }
                      className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("add")}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-1 py-1 shadow-sm">
                      <button
                        onClick={() => cart.updateQuantity(key, line.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-foreground transition hover:bg-secondary"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-4 text-center text-sm font-semibold">{line.quantity}</span>
                      <button
                        onClick={() => cart.updateQuantity(key, line.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-foreground transition hover:bg-secondary"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-on picker (modal) — quantity for the item + optional extras
// ---------------------------------------------------------------------------

function AddOnPicker({
  item,
  addOns,
  onClose,
  onConfirm,
}: {
  item: PublicMenuItem;
  addOns: PublicAddOn[];
  onClose: () => void;
  onConfirm: (quantity: number, selected: CartAddOn[]) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const { t } = useLanguage();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const selectedAddOns: CartAddOn[] = addOns
    .filter((a) => (selections[a.id] ?? 0) > 0)
    .map((a) => ({ addOnId: a.id, name: a.name, price: a.price, quantity: selections[a.id] }));
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
  const total = Math.round((item.price * quantity + addOnsTotal) * 100) / 100;

  function setAddOnQty(id: string, qty: number) {
    setSelections((prev) => ({ ...prev, [id]: Math.max(0, Math.min(9, qty)) }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Customize ${item.name}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">{item.name}</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-background p-1.5 text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
            <span className="text-sm font-medium">{t("quantity")}</span>
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-1 py-1 shadow-sm">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-secondary"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-5 text-center text-sm font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-secondary"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {addOns.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("addons_label")}</p>
              <div className="space-y-2">
                {addOns.map((addOn) => {
                  const qty = selections[addOn.id] ?? 0;
                  return (
                    <div
                      key={addOn.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-4 py-2.5 transition",
                        qty > 0 ? "border-primary bg-primary/5" : "border-border bg-background"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{addOn.name}</p>
                        <p className="text-xs text-muted-foreground">+{formatCurrency(addOn.price)}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-1 py-1 shadow-sm">
                        <button
                          onClick={() => setAddOnQty(addOn.id, qty - 1)}
                          disabled={qty === 0}
                          className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-secondary disabled:opacity-30"
                          aria-label={`Decrease ${addOn.name}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-4 text-center text-sm font-semibold">{qty}</span>
                        <button
                          onClick={() => setAddOnQty(addOn.id, qty + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-secondary"
                          aria-label={`Increase ${addOn.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <button
            onClick={() => onConfirm(quantity, selectedAddOns)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            {t("add_to_cart")} — {formatCurrency(total)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cart panel (slide-over)
// ---------------------------------------------------------------------------

function CartPanel({
  cart,
  onClose,
  onCheckout,
}: {
  cart: ReturnType<typeof useCart>;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const { t } = useLanguage();
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/50"
      onClick={(e) => {
        // Only close when the backdrop itself was clicked, not the panel.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">{t("your_cart")}</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-background p-2 text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("cart_empty")}</p>
          ) : (
            <div className="space-y-4">
              {cart.items.map((line) => (
                <div key={line.key} className="flex gap-3 rounded-lg border border-border bg-background p-3 shadow-sm">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{line.name}</p>
                        {line.comboMealId && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                            <Gift className="h-2.5 w-2.5" /> Combo
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => cart.removeItem(line.key)}
                        className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${line.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatCurrency(line.price)} each</p>
                    {line.addOns.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {line.addOns.map((a) => (
                          <li key={a.addOnId} className="text-xs text-muted-foreground">
                            + {a.name} {a.quantity > 1 ? `×${a.quantity}` : ""} ({formatCurrency(a.price * a.quantity)})
                          </li>
                        ))}
                      </ul>
                    )}
                    <input
                      value={line.notes}
                      onChange={(e) => cart.updateNotes(line.key, e.target.value)}
                      placeholder="Add a note (e.g. no onions)"
                      className="mt-2 w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-1 py-1 shadow-sm">
                        <button
                          onClick={() => cart.updateQuantity(line.key, line.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-secondary"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-4 text-center text-sm font-semibold">{line.quantity}</span>
                        <button
                          onClick={() => cart.updateQuantity(line.key, line.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-secondary"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="font-medium">{formatCurrency(cart.lineTotal(line))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="mb-3 flex items-center justify-between font-display text-lg font-bold">
            <span>{t("total")}</span>
            <span>{formatCurrency(cart.subtotal)}</span>
          </div>
          <button
            onClick={onCheckout}
            disabled={cart.items.length === 0}
            className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {t("proceed_checkout")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checkout view
// ---------------------------------------------------------------------------

function CheckoutView({
  channel,
  tableToken,
  cart,
  onBack,
  onPlaced,
}: {
  channel: "KIOSK" | "QR";
  tableToken?: string;
  cart: ReturnType<typeof useCart>;
  onBack: () => void;
  onPlaced: (order: { id: string; orderNumber: string; totalAmount: number }) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "GCASH" | "MAYA" | "CARD">("CASH");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          tableToken,
          customerName,
          paymentMethod,
          notes,
          items: cart.items.map((l) => ({
            menuItemId: l.menuItemId,
            comboMealId: l.comboMealId,
            quantity: l.quantity,
            notes: l.notes,
            addOns: l.addOns.map((a) => ({ addOnId: a.addOnId, quantity: a.quantity })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to place order.");
      onPlaced(data.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back_to_menu")}
      </button>

      <h1 className="font-display text-2xl font-bold">{t("checkout_title")}</h1>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("order_summary")}
        </h2>
        <div className="space-y-2">
          {cart.items.map((line) => (
            <div key={line.key} className="flex justify-between text-sm">
              <span>
                {line.quantity}× {line.name}
                {line.comboMealId && <span className="text-muted-foreground"> (Combo)</span>}
                {line.addOns.length > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {line.addOns.map((a) => (a.quantity > 1 ? `${a.name} ×${a.quantity}` : a.name)).join(", ")}
                  </span>
                )}
                {line.notes && <span className="text-muted-foreground"> — {line.notes}</span>}
              </span>
              <span className="font-medium">{formatCurrency(cart.lineTotal(line))}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-display text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(cart.subtotal)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="customer-name">
            {channel === "KIOSK" ? t("name_pickup_kiosk") : t("name_optional")}
          </label>
          <input
            id="customer-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            maxLength={80}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Juan"
          />
        </div>

        <div>
          <p className="mb-2 block text-sm font-medium">{t("payment_method")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition",
                  paymentMethod === method.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-secondary"
                )}
              >
                {method.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {paymentMethod === "CASH"
              ? t("pay_cash_note")
              : t("pay_other_note")}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="order-notes">
            {t("order_notes")}
          </label>
          <textarea
            id="order-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={300}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("order_notes_placeholder")}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || cart.items.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("place_order")} — {formatCurrency(cart.subtotal)}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation view (with status polling)
// ---------------------------------------------------------------------------

function ConfirmationView({
  order,
  channel,
  onStartOver,
}: {
  order: { id: string; orderNumber: string; totalAmount: number; estimatedMinutes: number };
  channel: "KIOSK" | "QR";
  onStartOver: () => void;
}) {
  const [status, setStatus] = useState<string>("PENDING");

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStatus(data.order.status);
      } catch {
        // transient network error — next poll will retry
      }
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [order.id]);

  const { t } = useLanguage();
  const statusKeys = STATUS_KEYS[status] ?? STATUS_KEYS.PENDING;

  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
      <h1 className="mt-4 font-display text-2xl font-bold">{t("order_placed")}</h1>
      <p className="mt-1 text-muted-foreground">{t("show_number")}</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("order_number")}</p>
        <p className="font-display text-4xl font-black text-primary">{order.orderNumber}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t("total")}: {formatCurrency(order.totalAmount)}</p>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          {t("est_wait", { min: order.estimatedMinutes })}
        </div>

        <div className="mt-5 rounded-lg bg-secondary px-4 py-3">
          <p className="font-semibold">{t(statusKeys.label)}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t(statusKeys.description)}</p>
        </div>

        <Link
          href={`/track/${order.id}`}
          target="_blank"
          className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("track_link")}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("bookmark_note")}
        </p>
      </div>

      {channel === "KIOSK" && (
        <button
          onClick={onStartOver}
          className="mt-8 rounded-md border border-border px-6 py-2.5 text-sm font-medium transition hover:bg-secondary"
        >
          {t("start_new_order")}
        </button>
      )}
    </div>
  );
}
