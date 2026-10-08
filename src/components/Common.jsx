import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Heart, PackageOpen, ShoppingBag } from "lucide-react";
import { useAuth } from "../state/AuthContext.jsx";
import { formatMoney } from "../utils/money.js";
import { addCartItem } from "../services/commerce.js";

export function Notice({ message, kind = "error" }) {
  if (!message) return null;
  return (
    <div className={`notice notice-${kind}`} role="status">
      {message}
    </div>
  );
}

export function EmptyState({ title, detail, action, to = "/shop" }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <PackageOpen />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action && (
        <Link className="button button-dark" to={to}>
          {action}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

export function LoadingBlock({ rows = 4 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-image" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

export function ProductCard({ product, compact = false, onWishlistChange }) {
  const { user, wishlistIds, storeSettings, refreshCustomerData } = useAuth();
  const navigate = useNavigate();
  const [quickAddState, setQuickAddState] = useState("");
  const saved = wishlistIds.includes(product.id);
  const price =
    product.sale_price != null &&
    Number(product.sale_price) < Number(product.price)
      ? Number(product.sale_price)
      : Number(product.price);
  const discount =
    price < Number(product.price)
      ? Math.round((1 - price / Number(product.price)) * 100)
      : 0;
  async function quickAdd() {
    if (!user) return navigate("/signin");
    if (product.stock_quantity < 1) return;
    setQuickAddState("Adding…");
    try {
      await addCartItem(user.id, product.id, 1);
      await refreshCustomerData(user.id);
      setQuickAddState("Added");
      window.setTimeout(() => setQuickAddState(""), 1600);
    } catch {
      setQuickAddState("Unavailable");
      window.setTimeout(() => setQuickAddState(""), 2200);
    }
  }
  return (
    <article
      className={`product-card ${compact ? "product-card-compact" : ""}`}
    >
      <Link className="product-image-wrap" to={`/product/${product.slug}`}>
        {product.main_image_url ? (
          <img src={product.main_image_url} alt={product.name} loading="lazy" />
        ) : (
          <span className="image-empty">AB</span>
        )}
        {discount > 0 && <span className="discount-tag">-{discount}%</span>}
      </Link>
      <button
        className={`wishlist-button ${saved ? "saved" : ""}`}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        title={
          user
            ? saved
              ? "Remove from wishlist"
              : "Add to wishlist"
            : "Sign in to save"
        }
        onClick={async () => onWishlistChange?.(product.id, saved)}
      >
        <Heart size={18} fill={saved ? "currentColor" : "none"} />
      </button>
      <div className="product-card-body">
        <Link to={`/product/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        {product.brand && (
          <span className="product-brand">{product.brand}</span>
        )}
        <div className="product-price">
          <strong>{formatMoney(price, storeSettings?.currency_code)}</strong>
          {discount > 0 && (
            <del>
              {formatMoney(product.price, storeSettings?.currency_code)}
            </del>
          )}
        </div>
        {!compact && (
          <>
            <div
              className={`stock-label ${product.stock_quantity > 0 ? "" : "out"}`}
            >
              {product.stock_quantity > 0 ? "In stock" : "Out of stock"}
            </div>
            <button
              type="button"
              className="quick-add-button"
              disabled={
                product.stock_quantity < 1 || quickAddState === "Adding…"
              }
              onClick={quickAdd}
            >
              <ShoppingBag size={14} />
              {quickAddState ||
                (product.stock_quantity > 0 ? "Add to bag" : "Sold out")}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function SectionHeading({ eyebrow, title, to, action = "View all" }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {to && (
        <Link to={to} className="text-link">
          {action}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
