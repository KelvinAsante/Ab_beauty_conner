import { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  SlidersHorizontal,
  Settings2,
  Star,
  Trash2,
  Truck,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../state/AuthContext.jsx";
import {
  signIn,
  signUp,
  requestPasswordReset,
  updatePassword,
  updateProfile,
  uploadProfileAvatar,
  deleteProfileAvatar,
  avatarPathFromUrl,
} from "../services/auth.js";
import {
  getProductBySlug,
  getProductReviews,
  getStoreSettings,
  listCategories,
  listProducts,
} from "../services/catalog.js";
import {
  deleteAddress,
  getOrder,
  listAddresses,
  listOrders,
  listWishlist,
  loadCart,
  initializePaystackPayment,
  saveAddress,
  setCartQuantity,
  submitReview,
  removeCartItem,
  verifyPaystackPayment,
} from "../services/commerce.js";
import {
  EmptyState,
  LoadingBlock,
  Notice,
  ProductCard,
  SectionHeading,
} from "../components/Common.jsx";
import { formatMoney } from "../utils/money.js";

function useWishlistAction() {
  const { toggleProductWishlist } = useAuth();
  return async (product, saved) => {
    try {
      await toggleProductWishlist(product, saved);
    } catch (error) {
      window.alert(error.message);
    }
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function downloadReceipt(order, currencyCode) {
  const money = (value) =>
    escapeHtml(formatMoney(value, currencyCode));
  const items = (order.order_items || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.product_name)} × ${escapeHtml(item.quantity)}</td>
          <td>${money(item.subtotal)}</td>
        </tr>`,
    )
    .join("");
  const reference = order.payment_reference
    ? `<p><b>Payment reference:</b> ${escapeHtml(order.payment_reference)}</p>`
    : "";
  const date = escapeHtml(new Date(order.created_at).toLocaleString());
  const document = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Receipt ${escapeHtml(order.order_number)} · AB Beauty Conner</title>
  <style>
    body{font:15px Arial,sans-serif;color:#28232a;max-width:720px;margin:40px auto;padding:0 20px}
    h1{font-size:26px;margin-bottom:4px}h2{font-size:17px;margin-top:32px}
    .muted{color:#746e76}table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #e8e4e9}
    th:last-child,td:last-child{text-align:right}.totals{margin:20px 0 0 auto;width:min(100%,320px)}
    .totals p{display:flex;justify-content:space-between}.total{font-size:18px;font-weight:bold}
  </style>
</head>
<body>
  <h1>AB Beauty Conner</h1>
  <p class="muted">Payment receipt</p>
  <p><b>Order:</b> ${escapeHtml(order.order_number)}<br><b>Date:</b> ${date}<br><b>Payment status:</b> Paid</p>
  ${reference}
  <h2>Customer and delivery</h2>
  <p>${escapeHtml(order.shipping_full_name)}<br>${escapeHtml(order.shipping_address)}<br>${escapeHtml(order.shipping_city)}, ${escapeHtml(order.shipping_region)}<br>${escapeHtml(order.shipping_phone)}</p>
  <h2>Order items</h2>
  <table><thead><tr><th>Item</th><th>Amount</th></tr></thead><tbody>${items}</tbody></table>
  <div class="totals">
    <p><span>Subtotal</span><b>${money(order.subtotal)}</b></p>
    <p><span>Delivery</span><b>${money(order.delivery_fee)}</b></p>
    <p class="total"><span>Total paid</span><b>${money(order.total_amount)}</b></p>
  </div>
  <p class="muted">Thank you for shopping with AB Beauty Conner.</p>
</body>
</html>`;
  const url = URL.createObjectURL(
    new Blob([document], { type: "text/html;charset=utf-8" }),
  );
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `AB-Beauty-Conner-${order.order_number}-receipt.html`;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function useStoreData(load) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, error: "" });
    Promise.resolve(load())
      .then((data) => {
        if (active) setState({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            data: null,
            error: error.message || "Unable to load store data.",
          });
      });
    return () => {
      active = false;
    };
  }, [load]);
  return state;
}

const categoryArt = [
  { match: /hair|wig/, image: "photo-1524504388940-b1c1722653e1" },
  { match: /perfume|beauty|skin/, image: "photo-1596462502278-27bfdc403348" },
  {
    match: /women|woman|lady|dress/,
    image: "photo-1483985988355-763728e1935b",
  },
  { match: /men|man/, image: "photo-1515886657613-9f3515b0c78f" },
  { match: /shoe|footwear/, image: "photo-1542291026-7eec264c27ff" },
  { match: /bag/, image: "photo-1553062407-98eeb64c6a62" },
  { match: /watch/, image: "photo-1523275335684-37898b6baf30" },
  { match: /accessor/, image: "photo-1611652022419-a9419f74343d" },
];
function CategoryTile({ category, productCount }) {
  const art =
    categoryArt.find((item) => item.match.test(category.name)) ||
    categoryArt[category.name.length % categoryArt.length];
  return (
    <Link className="category-tile" to={`/category/${category.slug}`}>
      <span className="category-tile-image">
        <img
          src={
            category.image_url ||
            `https://images.unsplash.com/${art.image}?auto=format&fit=crop&w=480&q=80`
          }
          alt=""
          loading="lazy"
        />
      </span>
      <span className="category-tile-copy">
        <b>{category.name}</b>
        <small>
          {productCount} {productCount === 1 ? "item" : "items"}
        </small>
        <span className="category-tile-action">
          <ArrowRight size={14} />
        </span>
      </span>
    </Link>
  );
}

function ProductShelf({ title, eyebrow, products, to, compact }) {
  const wish = useWishlistAction();
  return (
    <section className="section shell">
      <SectionHeading title={title} eyebrow={eyebrow} to={to} />
      <div className={compact ? "product-shelf" : "product-grid"}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            compact={compact}
            onWishlistChange={wish}
          />
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const [data, setData] = useState({
    products: [],
    categories: [],
    settings: null,
    loading: true,
    error: "",
  });
  useEffect(() => {
    let alive = true;
    Promise.all([
      listProducts({ limit: 40 }),
      listCategories(),
      getStoreSettings(),
    ])
      .then(
        ([products, categories, settings]) =>
          alive &&
          setData({
            products,
            categories,
            settings,
            loading: false,
            error: "",
          }),
      )
      .catch(
        (error) =>
          alive &&
          setData((value) => ({
            ...value,
            loading: false,
            error: error.message,
          })),
      );
    return () => {
      alive = false;
    };
  }, []);
  const products = data.products;
  const deals = products.filter(
    (product) =>
      product.sale_price != null &&
      Number(product.sale_price) < Number(product.price),
  );
  const featured = products.filter((product) => product.is_featured);
  const newArrivals = [...products].slice(0, 8);
  const popular = featured.length ? featured : products;
  const hairCategory = data.categories.find((category) =>
    /hair|wig/i.test(category.name),
  );
  const wish = useWishlistAction();
  return (
    <>
      <section className="hero-band">
        <div className="shell hero-layout">
          <div className="hero-copy">
            <span className="hero-kicker">
              NEW COLLECTION
            </span>
            <h1>
              Let your beauty <em>speak</em>
            </h1>
            <p>
              Beauty and style picks for the way you want to show up.
            </p>
            <Link to="/shop" className="button button-dark">
              Shop Now <ArrowRight size={17} />
            </Link>
            <div className="hero-proof">
              <span>
                <ShieldCheck size={16} /> Secure checkout
              </span>
              <span>
                <PackageCheck size={16} /> Curated with care
              </span>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="/images/hero_wig.jpeg"
              alt="Display of wigs on mannequin stands"
            />
            <span className="hero-image-index">01 / 03</span>
          </div>
          <span className="hero-orbit" aria-hidden="true">
            AB
          </span>
        </div>
      </section>
      <section className="service-notes shell">
        <div>
          <ShieldCheck />
          <span>
            <b>Premium quality</b>
            <small>Selected with care</small>
          </span>
        </div>
        <div>
          <Truck />
          <span>
            <b>Fast delivery</b>
            <small>Home delivery available</small>
          </span>
        </div>
        <div>
          <Heart />
          <span>
            <b>Made for your style</b>
            <small>Beauty for every day</small>
          </span>
        </div>
      </section>
      {data.error && (
        <div className="shell">
          <Notice message={`Catalog could not load: ${data.error}`} />
        </div>
      )}
      <section id="categories" className="category-section shell">
        <div className="category-section-title">
          <span className="eyebrow">FIND YOUR SOMETHING</span>
          <h2>Shop by category</h2>
        </div>
        {data.loading ? (
          <div className="category-loading">Loading categories…</div>
        ) : data.categories.length ? (
          <div className="category-grid">
            {data.categories.map((category) => (
              <CategoryTile
                key={category.id}
                category={category}
                productCount={
                  products.filter(
                    (product) => product.category_id === category.id,
                  ).length
                }
              />
            ))}
          </div>
        ) : (
          <div className="category-loading">
            Categories added by the store will appear here.
          </div>
        )}
      </section>
      {data.loading ? (
        <section className="section shell">
          <LoadingBlock rows={4} />
        </section>
      ) : (
        <>
          {deals.length > 0 && (
            <ProductShelf
              title="Deals of the day"
              eyebrow="REAL SAVINGS ON SELECTED FINDS"
              products={deals.slice(0, 10)}
              to="/shop?deals=true"
              compact
            />
          )}
          {newArrivals.length > 0 && (
            <ProductShelf
              title="New arrivals"
              eyebrow="JUST ADDED TO THE COLLECTION"
              products={newArrivals.slice(0, 4)}
              to="/shop?sort=newest"
            />
          )}
          <section className="deals-banner shell">
            <div className="deals-banner-copy">
              <span className="eyebrow">AB BEAUTY CONNER · CHRISTMAS SALE</span>
              <h2>
                Quality hair.
                <br />
                <em>Beautifully you.</em>
              </h2>
              <p>Home delivery available.</p>
              <Link
                className="button button-dark"
                to={hairCategory ? `/category/${hairCategory.slug}` : "/shop"}
              >
                Shop hair <ArrowRight size={16} />
              </Link>
            </div>
            <img
              className="deals-banner-image"
              src="/images/christmas-hair-sale.jpeg"
              alt="AB Beauty Conner Christmas sale on quality hair"
              loading="lazy"
            />
          </section>
          {featured.length > 0 && (
            <ProductShelf
              title="Featured finds"
              eyebrow="HANDPICKED FOR YOU"
              products={featured.slice(0, 8)}
              to="/shop?featured=true"
            />
          )}
          {products.length === 0 && (
            <section className="shell catalog-empty-note">
              <span className="eyebrow">THE COLLECTION IS TAKING SHAPE</span>
              <p>
                Products published by the store team will appear here
                automatically.
              </p>
              <Link className="text-link" to="/shop">
                Browse the shop <ArrowRight size={15} />
              </Link>
            </section>
          )}
        </>
      )}
    </>
  );
}

export function ShopPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchValue = searchParams.get("search") || "";
  const [search, setSearch] = useState(searchValue);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [available, setAvailable] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [activeCategoryName, setActiveCategoryName] = useState("");
  const showDeals = searchParams.get("deals") === "true";
  const showFeatured = searchParams.get("featured") === "true";
  const wish = useWishlistAction();
  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch((reason) => setError(reason.message));
  }, []);
  useEffect(() => {
    const category = categories.find((item) => item.slug === slug);
    setCategoryId(category?.id || searchParams.get("category") || "");
    setActiveCategoryName(category?.name || "");
  }, [categories, slug, searchParams]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    listProducts({ categoryId, search: searchValue, sort, limit: 100 })
      .then((items) => {
        if (alive) {
          setProducts(items);
          setError("");
          setPage(1);
        }
      })
      .catch((reason) => alive && setError(reason.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [categoryId, searchValue, sort]);
  const visible = useMemo(() => {
    const filtered = products.filter(
      (product) =>
        (!available || product.stock_quantity > 0) &&
        (!maxPrice ||
          Number(
            product.sale_price != null &&
              Number(product.sale_price) < Number(product.price)
              ? product.sale_price
              : product.price,
          ) <= Number(maxPrice)) &&
        (!showDeals ||
          (product.sale_price != null &&
            Number(product.sale_price) < Number(product.price))) &&
        (!showFeatured || product.is_featured),
    );
    if (sort === "price-low")
      filtered.sort(
        (a, b) =>
          Number(
            a.sale_price != null && a.sale_price < a.price
              ? a.sale_price
              : a.price,
          ) -
          Number(
            b.sale_price != null && b.sale_price < b.price
              ? b.sale_price
              : b.price,
          ),
      );
    if (sort === "price-high")
      filtered.sort(
        (a, b) =>
          Number(
            b.sale_price != null && b.sale_price < b.price
              ? b.sale_price
              : b.price,
          ) -
          Number(
            a.sale_price != null && a.sale_price < a.price
              ? a.sale_price
              : a.price,
          ),
      );
    return filtered;
  }, [products, available, maxPrice, showDeals, showFeatured, sort]);
  const shown = visible.slice(0, page * 12);
  function submitSearch(event) {
    event.preventDefault();
    setSearchParams((current) => {
      if (search.trim()) current.set("search", search.trim());
      else current.delete("search");
      return current;
    });
  }
  return (
    <section className="shop-page shell">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Shop</span>
        {activeCategoryName && (
          <>
            <span>/</span>
            <b>{activeCategoryName}</b>
          </>
        )}
      </div>
      <div className="shop-heading">
        <div>
          <span className="eyebrow">THE FULL EDIT</span>
          <h1>{activeCategoryName || "Shop all"}</h1>
          <p>Explore the current AB Beauty Conner collection.</p>
        </div>
        <span className="results-count">{visible.length} pieces</span>
      </div>
      <div className="shop-toolbar">
        <form className="shop-search" onSubmit={submitSearch}>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search the collection"
          />
          <button className="button button-dark" type="submit">
            Search
          </button>
        </form>
        <div className="shop-filters">
          <label>
            <SlidersHorizontal size={16} />
            <select
              aria-label="Category"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                if (slug)
                  setSearchParams(
                    event.target.value ? { category: event.target.value } : {},
                  );
              }}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="price-filter">
            Up to{" "}
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Any price"
              aria-label="Maximum price"
            />
          </label>
          <label>
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setSearchParams((params) => {
                  params.set("sort", event.target.value);
                  return params;
                });
              }}
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
          <label className="availability-filter">
            <input
              type="checkbox"
              checked={available}
              onChange={(event) => setAvailable(event.target.checked)}
            />{" "}
            In stock
          </label>
        </div>
      </div>
      {error && <Notice message={error} />}
      {loading ? (
        <LoadingBlock rows={8} />
      ) : shown.length ? (
        <>
          <div className="product-grid shop-grid">
            {shown.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onWishlistChange={wish}
              />
            ))}
          </div>
          {shown.length < visible.length && (
            <div className="load-more">
              <button
                className="button button-outline"
                onClick={() => setPage((value) => value + 1)}
              >
                Load more products
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="Nothing matches just yet"
          detail="Try a different search or category. New finds are added by the store team."
          action="Browse all products"
        />
      )}
    </section>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const {
    user,
    wishlistIds,
    addProductToCart,
    toggleProductWishlist,
    storeSettings,
  } = useAuth();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [image, setImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getProductBySlug(slug)
      .then(async (item) => {
        const [reviewItems, others] = await Promise.all([
          getProductReviews(item.id),
          listProducts({ categoryId: item.category_id, limit: 5 }),
        ]);
        if (!alive) return;
        setProduct(item);
        setImage(
          item.main_image_url || item.product_images?.[0]?.image_url || "",
        );
        setReviews(reviewItems);
        setRelated(others.filter((other) => other.id !== item.id).slice(0, 4));
      })
      .catch((reason) => alive && setError(reason.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);
  async function addToCart() {
    try {
      await addProductToCart(product, quantity);
      setNotice("Added to your bag.");
      setError("");
    } catch (reason) {
      setError(reason.message);
    }
  }
  async function saveToWishlist() {
    try {
      await toggleProductWishlist(product, wishlistIds.includes(product.id));
    } catch (reason) {
      setError(reason.message);
    }
  }
  async function sendReview(event) {
    event.preventDefault();
    try {
      await submitReview({
        userId: user.id,
        productId: product.id,
        rating,
        review,
      });
      setNotice("Review submitted for approval.");
      setReview("");
      setError("");
    } catch (reason) {
      setError(
        reason.message.includes("duplicate")
          ? "You have already reviewed this product."
          : "A delivered purchase is required before reviewing.",
      );
    }
  }
  if (loading)
    return (
      <section className="shell page-space">
        <LoadingBlock rows={1} />
      </section>
    );
  if (!product)
    return (
      <section className="shell page-space">
        <EmptyState
          title="Product not found"
          detail={error || "This product may no longer be available."}
          action="Return to shop"
        />
      </section>
    );
  const activePrice =
    product.sale_price != null &&
    Number(product.sale_price) < Number(product.price)
      ? Number(product.sale_price)
      : Number(product.price);
  const gallery = [
    ...new Set(
      [
        product.main_image_url,
        ...(product.product_images || [])
          .sort((a, b) => a.display_order - b.display_order)
          .map((entry) => entry.image_url),
      ].filter(Boolean),
    ),
  ];
  return (
    <>
      <section className="shell product-detail page-space">
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/shop">Shop</Link>
          <span>/</span>
          <b>{product.name}</b>
        </div>
        <div className="product-detail-grid">
          <div className="gallery">
            <div className="gallery-main">
              {image ? (
                <img src={image} alt={product.name} />
              ) : (
                <span className="image-empty">AB</span>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="gallery-thumbs">
                {gallery.map((url) => (
                  <button
                    className={image === url ? "selected" : ""}
                    key={url}
                    onClick={() => setImage(url)}
                  >
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="product-info">
            <span className="eyebrow">
              {product.brand || "AB BEAUTY CONNER"}
            </span>
            <h1>{product.name}</h1>
            <div className="detail-price">
              <strong>
                {formatMoney(activePrice, storeSettings?.currency_code)}
              </strong>
              {activePrice < Number(product.price) && (
                <del>
                  {formatMoney(product.price, storeSettings?.currency_code)}
                </del>
              )}
            </div>
            <p className="product-description">
              {product.description ||
                "A considered addition to your beauty and style edit."}
            </p>
            <div
              className={`detail-stock ${product.stock_quantity ? "" : "out"}`}
            >
              <span />
              {product.stock_quantity
                ? `${product.stock_quantity} available`
                : "Currently out of stock"}
            </div>
            {product.sku && (
              <div className="sku-line">
                SKU <b>{product.sku}</b>
              </div>
            )}
            {product.stock_quantity > 0 && (
              <div className="purchase-row">
                <div className="quantity-control">
                  <button
                    aria-label="Reduce quantity"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((count) => count - 1)}
                  >
                    <Minus size={15} />
                  </button>
                  <span>{quantity}</span>
                  <button
                    aria-label="Add quantity"
                    disabled={quantity >= product.stock_quantity}
                    onClick={() => setQuantity((count) => count + 1)}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <button
                  className="button button-dark add-cart-button"
                  onClick={addToCart}
                >
                  <ShoppingBag size={18} />
                  Add to bag
                </button>
                <button
                  className={`icon-button wishlist-detail ${wishlistIds.includes(product.id) ? "saved" : ""}`}
                  aria-label="Toggle wishlist"
                  onClick={saveToWishlist}
                >
                  <Heart
                    fill={
                      wishlistIds.includes(product.id) ? "currentColor" : "none"
                    }
                  />
                </button>
              </div>
            )}
            <Notice message={notice} kind="success" />
            <Notice message={error} />
            <div className="delivery-note">
              <Truck size={18} />
              <span>
                <b>Delivery options at checkout</b>
                <small>Delivery fee is shown before order placement.</small>
              </span>
            </div>
            <div className="detail-accordions">
              <details open>
                <summary>Product details</summary>
                <p>
                  {product.description ||
                    "A considered addition to your collection."}
                </p>
              </details>
              <details>
                <summary>Shipping and returns</summary>
                <p>
                  Available delivery information is confirmed at checkout.
                  Contact support for help with an order.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>
      <section className="shell review-section">
        <div className="review-heading">
          <div>
            <span className="eyebrow">COMMUNITY NOTES</span>
            <h2>Customer reviews</h2>
          </div>
          <span>{reviews.length} approved</span>
        </div>
        {reviews.length ? (
          reviews.map((item) => (
            <article className="review-row" key={item.id}>
              <div className="review-stars">
                {Array.from({ length: item.rating }, (_, i) => (
                  <Star key={i} fill="currentColor" size={14} />
                ))}
              </div>
              <p>{item.review || "A customer left a rating."}</p>
              <small>{new Date(item.created_at).toLocaleDateString()}</small>
            </article>
          ))
        ) : (
          <p className="muted-copy">No approved reviews yet.</p>
        )}
        {user && (
          <form className="review-form" onSubmit={sendReview}>
            <h3>Share your experience</h3>
            <label>
              Rating
              <select
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your review
              <textarea
                rows="3"
                value={review}
                onChange={(event) => setReview(event.target.value)}
                placeholder="What did you think?"
              />
            </label>
            <button className="button button-outline">Submit review</button>
            <small>
              Reviews are published after approval. A delivered order is
              required.
            </small>
          </form>
        )}
      </section>
      {related.length > 0 && (
        <ProductShelf
          title="A few more to love"
          products={related}
          to="/shop"
        />
      )}
    </>
  );
}

function AuthFrame({
  eyebrow = "WELCOME TO AB BEAUTY CONNER",
  title,
  subtitle,
  children,
  className = "",
}) {
  return (
    <section className={`auth-page ${className}`}>
      <div className="auth-aside">
        <div className="auth-aside-content">
          <span className="auth-monogram">AB</span>
          <span className="eyebrow">BEAUTY, YOUR WAY</span>
          <h2>
            Find the pieces
            <br />
            that feel like <em>you.</em>
          </h2>
          <p>Thoughtful beauty and fashion, all in one place.</p>
        </div>
        <div className="auth-aside-photo" />
      </div>
      <div className="auth-main">
        <div className="auth-card">
          <Link className="back-link" to="/">
            <ArrowLeft size={16} /> Back to store
          </Link>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}

export function SignInPage() {
  const { user, profile, completeAuthentication } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const destination = (role) => {
    const from = location.state?.from;
    if (from?.pathname)
      return `${from.pathname}${from.search || ""}${from.hash || ""}`;
    return role === "admin" ? "/admin/dashboard" : "/account";
  };
  useEffect(() => {
    if (user && profile) navigate(destination(profile.role), { replace: true });
  }, [user, profile, navigate, location.state]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await signIn(email, password);
      await completeAuthentication(result.user.id);
      navigate(destination(result.profile.role), { replace: true });
    } catch (reason) {
      setError(
        reason.message || "Sign-in failed. Check your details and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      className="auth-page-signin"
      title="Good to see you."
      subtitle=""
    >
      <form className="stack-form" onSubmit={submit}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>
        <div className="form-inline">
          <span>
            <LockKeyhole size={14} /> Secure session
          </span>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Notice message={error} />
        <button className="button button-dark button-wide" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
          <ArrowRight size={17} />
        </button>
        <p className="auth-switch">
          New here?{" "}
          <Link to="/signup" state={location.state}>
            Create a customer account
          </Link>
        </p>
      </form>
    </AuthFrame>
  );
}

export function SignUpPage() {
  const { completeAuthentication } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8)
      return setError("Use a password with at least 8 characters.");
    if (form.password !== form.confirm)
      return setError("The passwords do not match.");
    setBusy(true);
    try {
      const data = await signUp(form);
      if (data.session) {
        await completeAuthentication(data.user.id);
        const from = location.state?.from;
        navigate(
          from?.pathname
            ? `${from.pathname}${from.search || ""}${from.hash || ""}`
            : "/account",
          { replace: true },
        );
      } else setSuccess("Check your inbox to verify your email, then sign in.");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      className="auth-page-signup"
      eyebrow="A GOOD PLACE TO BEGIN"
      title="Create your account."
      subtitle="Join the AB Beauty Conner community. New accounts are customer accounts."
    >
      <form className="stack-form" onSubmit={submit}>
        <label>
          Full name
          <input
            autoComplete="name"
            required
            value={form.fullName}
            onChange={(event) =>
              setForm({ ...form, fullName: event.target.value })
            }
          />
        </label>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="new-password"
            minLength="8"
            required
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            minLength="8"
            required
            value={form.confirm}
            onChange={(event) =>
              setForm({ ...form, confirm: event.target.value })
            }
          />
        </label>
        <Notice message={error} />
        <Notice message={success} kind="success" />
        <button className="button button-dark button-wide" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
          <ArrowRight size={17} />
        </button>
        <p className="auth-switch">
          Already a customer?{" "}
          <Link to="/signin" state={location.state}>
            Sign in
          </Link>
        </p>
      </form>
    </AuthFrame>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setSuccess(
        "If an account matches that email, a password reset link is on its way.",
      );
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Let’s reset that."
      subtitle="We’ll email you a secure link to choose a new password."
    >
      <form className="stack-form" onSubmit={submit}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <Notice message={error} />
        <Notice message={success} kind="success" />
        <button className="button button-dark button-wide" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
          <ArrowRight size={17} />
        </button>
        <p className="auth-switch">
          <Link to="/signin">Return to sign in</Link>
        </p>
      </form>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (password.length < 8 || password !== confirm)
      return setError(
        password !== confirm
          ? "The passwords do not match."
          : "Use at least 8 characters.",
      );
    setBusy(true);
    setError("");
    try {
      await updatePassword(password);
      navigate("/account", { replace: true });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Choose a new password."
      subtitle="Set a strong password to secure your account."
    >
      <form className="stack-form" onSubmit={submit}>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            minLength="8"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            minLength="8"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
        <Notice message={error} />
        <button className="button button-dark button-wide" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
          <ArrowRight size={17} />
        </button>
      </form>
    </AuthFrame>
  );
}

function AccountNav() {
  return (
    <nav className="account-tabs">
      <NavLink to="/account" end>
        Overview
      </NavLink>
      <NavLink to="/account/orders">Orders</NavLink>
      <NavLink to="/account/addresses">Addresses</NavLink>
      <NavLink to="/account/wishlist">Wishlist</NavLink>
    </nav>
  );
}

export function AccountPage({ adminMode = false }) {
  const { user, profile, setProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setAvatarPreview(profile?.avatar_url || "");
  }, [profile?.avatar_url]);
  useEffect(() => {
    listOrders(user.id)
      .then(setOrders)
      .catch((reason) => setError(reason.message));
  }, [user.id]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    let uploadedAvatar = null;
    try {
      if (avatarFile)
        uploadedAvatar = await uploadProfileAvatar(user.id, avatarFile);
      const next = await updateProfile(user.id, {
        full_name: fullName,
        phone: phone || null,
        ...(uploadedAvatar ? { avatar_url: uploadedAvatar.url } : {}),
      });
      setProfile(next);
      setAvatarFile(null);
      setNotice("Your profile has been updated.");
      await refreshProfile(user.id);
      const previousPath = avatarPathFromUrl(profile?.avatar_url);
      if (
        uploadedAvatar &&
        previousPath &&
        previousPath !== uploadedAvatar.path
      ) {
        try {
          await deleteProfileAvatar(previousPath);
        } catch {
          setNotice("Profile saved. The previous photo could not be removed.");
        }
      }
    } catch (reason) {
      if (uploadedAvatar) {
        try {
          await deleteProfileAvatar(uploadedAvatar.path);
        } catch {
          // Keep the original profile error visible if storage cleanup also fails.
        }
      }
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-page shell page-space">
      <div className="account-intro">
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h1>Hello, {profile?.full_name?.split(" ")[0] || "there"}.</h1>
          <p>Keep your details, orders and saved finds together.</p>
        </div>
        <div className="account-intro-actions">
          {adminMode ? (
            <Link className="text-link" to="/admin/dashboard">
              Admin dashboard <ArrowRight size={15} />
            </Link>
          ) : (
            <AccountNav />
          )}
          <button
            className="button button-outline"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="account-overview-grid">
        <form className="panel account-profile-form" onSubmit={submit}>
          <div className="panel-heading">
            <CircleUserRound />
            <div>
              <h2>Your profile</h2>
              <p>Update your contact information.</p>
            </div>
          </div>
          <div className="profile-photo-row">
            <span className="account-avatar-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile preview" />
              ) : (
                <span>{fullName.trim().slice(0, 1).toUpperCase() || "A"}</span>
              )}
            </span>
            <div className="profile-photo-copy">
              <b>Profile photo</b>
              <small>JPG, PNG, WEBP or AVIF. Maximum 4 MB.</small>
            </div>
            <label className="button button-outline avatar-upload-button">
              <Camera size={15} /> Choose photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (
                    !file.type.startsWith("image/") ||
                    file.size > 4 * 1024 * 1024
                  ) {
                    setError("Choose an image file smaller than 4 MB.");
                    event.target.value = "";
                    return;
                  }
                  setError("");
                  setAvatarFile(file);
                  setAvatarPreview(URL.createObjectURL(file));
                }}
              />
            </label>
          </div>
          <label>
            Full name
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label>
            Email address
            <input readOnly value={profile?.email || user.email || ""} />
          </label>
          <label>
            Phone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <Notice message={error} />
          <Notice message={notice} kind="success" />
          <button className="button button-dark" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
        <div className="account-side-stack">
          {adminMode ? (
            <>
              <Link className="account-action-panel" to="/admin/settings">
                <span className="account-action-icon">
                  <Settings2 />
                </span>
                <span>
                  <b>Store settings</b>
                  <small>Manage store contact and delivery details</small>
                </span>
                <ArrowRight />
              </Link>
              <Link className="account-action-panel" to="/admin/orders">
                <span className="account-action-icon rose-icon">
                  <PackageCheck />
                </span>
                <span>
                  <b>Manage orders</b>
                  <small>Open the store order queue</small>
                </span>
                <ArrowRight />
              </Link>
            </>
          ) : (
            <>
              <Link className="account-action-panel" to="/account/orders">
                <span className="account-action-icon">
                  <PackageCheck />
                </span>
                <span>
                  <b>Your orders</b>
                  <small>
                    {orders.length} order{orders.length === 1 ? "" : "s"} on
                    record
                  </small>
                </span>
                <ArrowRight />
              </Link>
              <Link className="account-action-panel" to="/account/addresses">
                <span className="account-action-icon rose-icon">
                  <MapPin />
                </span>
                <span>
                  <b>Delivery addresses</b>
                  <small>Manage saved locations</small>
                </span>
                <ArrowRight />
              </Link>
              <Link className="account-action-panel" to="/account/wishlist">
                <span className="account-action-icon sage-icon">
                  <Heart />
                </span>
                <span>
                  <b>Your wishlist</b>
                  <small>Return to saved finds</small>
                </span>
                <ArrowRight />
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function AdminProfilePage() {
  return <AccountPage adminMode />;
}

export function OrdersPage() {
  const { user, storeSettings } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listOrders(user.id)
      .then(setOrders)
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [user.id]);
  return (
    <section className="account-page shell page-space">
      <div className="account-intro">
        <div>
          <span className="eyebrow">YOUR HISTORY</span>
          <h1>My orders</h1>
        </div>
        <AccountNav />
      </div>
      <Notice message={error} />
      {loading ? (
        <LoadingBlock rows={3} />
      ) : orders.length ? (
        <div className="order-list">
          {orders.map((order) => (
            <details className="order-card" key={order.id}>
              <summary>
                <span>
                  <b>{order.order_number}</b>
                  <small>
                    {new Date(order.created_at).toLocaleDateString()}
                  </small>
                </span>
                <span className={`status-pill status-${order.status}`}>
                  {order.status}
                </span>
                <strong>
                  {formatMoney(
                    order.total_amount,
                    storeSettings?.currency_code,
                  )}
                </strong>
                <ChevronRight />
              </summary>
              <div className="order-details">
                <div className="order-detail-meta">
                  <span>
                    Payment <b>{order.payment_status}</b>
                  </span>
                  <span>
                    Ship to{" "}
                    <b>
                      {order.shipping_full_name}, {order.shipping_city}
                    </b>
                  </span>
                </div>
                {(order.order_items || []).map((item) => (
                  <div className="order-line" key={item.id}>
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                    <b>
                      {formatMoney(item.subtotal, storeSettings?.currency_code)}
                    </b>
                  </div>
                ))}
                {order.payment_status === "paid" && (
                  <Link
                    className="button button-outline receipt-history-link"
                    to={`/account/orders/${order.id}/receipt`}
                  >
                    View / download receipt <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No orders yet"
          detail="Your order history will appear here after checkout."
          action="Explore the collection"
        />
      )}
    </section>
  );
}

export function ReceiptPage() {
  const { orderId } = useParams();
  const { user, storeSettings } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: "",
    order: null,
  });

  useEffect(() => {
    let active = true;
    getOrder(user.id, orderId)
      .then((order) => {
        if (active) setState({ loading: false, error: "", order });
      })
      .catch((reason) => {
        if (active)
          setState({
            loading: false,
            error: reason.message || "Unable to load this receipt.",
            order: null,
          });
      });
    return () => {
      active = false;
    };
  }, [orderId, user.id]);

  const order = state.order;
  const paid = order?.payment_status === "paid";
  return (
    <section className="shell page-space receipt-page">
      {state.loading ? (
        <LoadingBlock rows={3} />
      ) : state.error ? (
        <div className="receipt-state">
          <Notice message={state.error} kind="error" />
          <Link className="button button-outline" to="/account/orders">
            Back to my orders
          </Link>
        </div>
      ) : !paid ? (
        <div className="receipt-state">
          <span className="eyebrow">PAYMENT RECEIPT</span>
          <h1>Payment not confirmed</h1>
          <p>A receipt is available after payment has been verified.</p>
          <Link className="button button-outline" to="/account/orders">
            Back to my orders
          </Link>
        </div>
      ) : (
        <>
          <div className="receipt-actions no-print">
            <Link className="text-link" to="/account/orders">
              <ArrowLeft size={15} /> Back to my orders
            </Link>
            <div>
              <button
                className="button button-outline"
                onClick={() =>
                  downloadReceipt(order, storeSettings?.currency_code)
                }
              >
                <Download size={16} /> Download receipt
              </button>
              <button
                className="button button-dark"
                onClick={() => window.print()}
              >
                <Printer size={16} /> Print / Save as PDF
              </button>
            </div>
          </div>
          <article className="receipt-document">
            <header className="receipt-heading">
              <div>
                <span className="eyebrow">AB BEAUTY CONNER</span>
                <h1>Payment receipt</h1>
              </div>
              <span className="receipt-paid">PAID</span>
            </header>
            <div className="receipt-meta">
              <p>
                <span>Order number</span>
                <b>{order.order_number}</b>
              </p>
              <p>
                <span>Payment date</span>
                <b>{new Date(order.created_at).toLocaleString()}</b>
              </p>
              {order.payment_reference && (
                <p>
                  <span>Payment reference</span>
                  <b>{order.payment_reference}</b>
                </p>
              )}
            </div>
            <section className="receipt-customer">
              <h2>Customer and delivery</h2>
              <p>
                <b>{order.shipping_full_name}</b>
                <br />
                {order.shipping_address}
                <br />
                {order.shipping_city}, {order.shipping_region}
                <br />
                {order.shipping_phone}
              </p>
            </section>
            <section>
              <h2>Order items</h2>
              <div className="receipt-item-list">
                {(order.order_items || []).map((item) => (
                  <div className="receipt-item" key={item.id}>
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                    <b>
                      {formatMoney(
                        item.subtotal,
                        storeSettings?.currency_code,
                      )}
                    </b>
                  </div>
                ))}
              </div>
            </section>
            <div className="receipt-totals">
              <p>
                <span>Subtotal</span>
                <b>
                  {formatMoney(order.subtotal, storeSettings?.currency_code)}
                </b>
              </p>
              <p>
                <span>Delivery fee</span>
                <b>
                  {formatMoney(
                    order.delivery_fee,
                    storeSettings?.currency_code,
                  )}
                </b>
              </p>
              <p className="receipt-total">
                <span>Total paid</span>
                <b>
                  {formatMoney(
                    order.total_amount,
                    storeSettings?.currency_code,
                  )}
                </b>
              </p>
            </div>
            <p className="receipt-thanks">
              Thank you for shopping with AB Beauty Conner.
            </p>
          </article>
        </>
      )}
    </section>
  );
}

export function AddressesPage() {
  const { user, profile } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    address: "",
    city: "",
    region: "",
    country: "Ghana",
    is_default: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  function refresh() {
    return listAddresses(user.id)
      .then(setAddresses)
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    refresh();
  }, [user.id]);
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await saveAddress(user.id, form);
      setForm({
        ...form,
        address: "",
        city: "",
        region: "",
        is_default: false,
      });
      await refresh();
    } catch (reason) {
      setError(reason.message);
    }
  }
  async function remove(id) {
    if (!window.confirm("Remove this saved address?")) return;
    try {
      await deleteAddress(id);
      await refresh();
    } catch (reason) {
      setError(reason.message);
    }
  }
  return (
    <section className="account-page shell page-space">
      <div className="account-intro">
        <div>
          <span className="eyebrow">DELIVERY DETAILS</span>
          <h1>Saved addresses</h1>
        </div>
        <AccountNav />
      </div>
      <Notice message={error} />
      <div className="addresses-grid">
        <div className="address-list">
          {loading ? (
            <LoadingBlock rows={2} />
          ) : addresses.length ? (
            addresses.map((address) => (
              <article className="address-card" key={address.id}>
                <div className="address-card-head">
                  <MapPin />
                  <span>
                    {address.is_default ? "Default address" : "Saved address"}
                  </span>
                  <button
                    className="icon-button subtle-danger"
                    aria-label="Delete address"
                    onClick={() => remove(address.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                <b>{address.full_name}</b>
                <span>{address.phone}</span>
                <p>
                  {address.address}
                  <br />
                  {address.city}, {address.region}
                  <br />
                  {address.country}
                </p>
              </article>
            ))
          ) : (
            <EmptyState
              title="No saved addresses"
              detail="Add a delivery address to make checkout quicker."
            />
          )}
        </div>
        <form className="panel address-form" onSubmit={submit}>
          <div className="panel-heading">
            <MapPin />
            <div>
              <h2>Add an address</h2>
              <p>All fields are saved to your account.</p>
            </div>
          </div>
          {[
            ["full_name", "Full name"],
            ["phone", "Phone"],
            ["address", "Street address"],
            ["city", "City"],
            ["region", "Region"],
            ["country", "Country"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                required
                value={form[key]}
                onChange={(event) =>
                  setForm({ ...form, [key]: event.target.value })
                }
              />
            </label>
          ))}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(event) =>
                setForm({ ...form, is_default: event.target.checked })
              }
            />{" "}
            Set as default
          </label>
          <button className="button button-dark">Save address</button>
        </form>
      </div>
    </section>
  );
}

export function WishlistPage() {
  const { user, guestWishlist, refreshCustomerData, toggleProductWishlist } =
    useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() {
    if (!user) {
      setItems(guestWishlist);
      setLoading(false);
      return;
    }
    try {
      setItems(await listWishlist(user.id));
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [user?.id, guestWishlist]);
  async function remove(item) {
    try {
      await toggleProductWishlist(item.products, true);
      await refresh();
      if (user) await refreshCustomerData(user.id);
    } catch (reason) {
      setError(reason.message);
    }
  }
  return (
    <section className="account-page shell page-space">
      <div className="account-intro">
        <div>
          <span className="eyebrow">SAVED FOR LATER</span>
          <h1>Your wishlist</h1>
        </div>
        <AccountNav />
      </div>
      <Notice message={error} />
      {loading ? (
        <LoadingBlock rows={4} />
      ) : items.length ? (
        <div className="product-grid">
          {items
            .filter((item) => item.products)
            .map((item) => (
              <div className="wishlist-card" key={item.id}>
                <ProductCard product={item.products} />
                <button
                  className="wishlist-remove"
                  onClick={() => remove(item)}
                >
                  <Trash2 size={15} />
                  Remove
                </button>
              </div>
            ))}
        </div>
      ) : (
        <EmptyState
          title="Your wishlist is waiting"
          detail="Tap the heart on something you love and it will be saved here."
          action="Explore the shop"
        />
      )}
    </section>
  );
}

export function CartPage() {
  const {
    user,
    guestCart,
    refreshCustomerData,
    setGuestCartItemQuantity,
    deleteGuestCartItem,
    storeSettings,
  } = useAuth();
  const [cart, setCart] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() {
    if (!user) {
      setCart(guestCart);
      setLoading(false);
      return;
    }
    try {
      const result = await loadCart(user.id);
      setCart(result.items);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [user?.id, guestCart]);
  async function change(item, quantity) {
    if (quantity > (item.products?.stock_quantity || 0))
      return setError("Quantity exceeds available stock.");
    if (!user) {
      setGuestCartItemQuantity(item.id, quantity);
      setError("");
      return;
    }
    try {
      await setCartQuantity(item.id, quantity);
      await Promise.all([refresh(), refreshCustomerData(user.id)]);
      setError("");
    } catch (reason) {
      setError(reason.message);
    }
  }
  async function remove(item) {
    if (!user) {
      deleteGuestCartItem(item.id);
      return;
    }
    try {
      await removeCartItem(item.id);
      await Promise.all([refresh(), refreshCustomerData(user.id)]);
    } catch (reason) {
      setError(reason.message);
    }
  }
  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(
        item.products?.sale_price &&
          item.products.sale_price < item.products.price
          ? item.products.sale_price
          : item.products?.price || 0,
      ) *
        item.quantity,
    0,
  );
  const hasUnavailableItems = cart.some(
    (item) =>
      !item.products?.is_active || item.products.stock_quantity < item.quantity,
  );
  return (
    <section className="shell page-space cart-page">
      <div className="shop-heading">
        <div>
          <span className="eyebrow">YOUR SELECTION</span>
          <h1>Shopping bag</h1>
          <p>Review your finds before checkout.</p>
        </div>
        <Link className="text-link" to="/shop">
          Continue shopping <ArrowRight size={16} />
        </Link>
      </div>
      <Notice message={error} />
      {loading ? (
        <LoadingBlock rows={3} />
      ) : cart.length ? (
        <div className="cart-layout">
          <div className="cart-lines">
            {cart.map((item) => {
              const product = item.products;
              if (!product)
                return (
                  <article
                    className="cart-line unavailable-cart-line"
                    key={item.id}
                  >
                    <span className="cart-thumb">
                      <span>AB</span>
                    </span>
                    <div className="cart-line-info">
                      <b>Product unavailable</b>
                      <small>This item is no longer active in the store.</small>
                    </div>
                    <button
                      className="icon-button subtle-danger"
                      aria-label="Remove unavailable item"
                      onClick={() => remove(item)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                );
              const unit = Number(
                product.sale_price && product.sale_price < product.price
                  ? product.sale_price
                  : product.price,
              );
              return (
                <article className="cart-line" key={item.id}>
                  <Link to={`/product/${product.slug}`} className="cart-thumb">
                    {product.main_image_url ? (
                      <img src={product.main_image_url} alt="" />
                    ) : (
                      <span>AB</span>
                    )}
                  </Link>
                  <div className="cart-line-info">
                    <Link to={`/product/${product.slug}`}>
                      <b>{product.name}</b>
                    </Link>
                    <small>
                      {product.stock_quantity
                        ? `${product.stock_quantity} available`
                        : "Currently unavailable"}
                    </small>
                    <div className="quantity-control">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() => change(item, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        disabled={item.quantity >= product.stock_quantity}
                        onClick={() => change(item, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <strong>
                    {formatMoney(
                      unit * item.quantity,
                      storeSettings?.currency_code,
                    )}
                  </strong>
                  <button
                    className="icon-button subtle-danger"
                    aria-label="Remove item"
                    onClick={() => remove(item)}
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              );
            })}
          </div>
          <aside className="cart-summary">
            <span className="eyebrow">ORDER SUMMARY</span>
            <h2>Your total</h2>
            <div>
              <span>Subtotal</span>
              <b>{formatMoney(subtotal, storeSettings?.currency_code)}</b>
            </div>
            <div>
              <span>Delivery</span>
              <small>Calculated at checkout</small>
            </div>
            <div className="summary-total">
              <span>Estimated total</span>
              <b>{formatMoney(subtotal, storeSettings?.currency_code)}</b>
            </div>
            {hasUnavailableItems && (
              <Notice message="Remove unavailable items or adjust quantities before checkout." />
            )}
            <Link
              className={`button button-dark button-wide ${hasUnavailableItems ? "disabled-link" : ""}`}
              aria-disabled={hasUnavailableItems}
              onClick={(event) => hasUnavailableItems && event.preventDefault()}
              to="/checkout"
            >
              Continue to checkout <ArrowRight size={17} />
            </Link>
            <small className="secure-note">
              <ShieldCheck size={14} /> Final prices and stock are confirmed
              securely at checkout.
            </small>
          </aside>
        </div>
      ) : (
        <EmptyState
          title="Your bag is empty"
          detail="A new favorite is just a browse away."
          action="Explore the collection"
        />
      )}
    </section>
  );
}

const deliveryOptions = [
  { location: "Accra", fee: 40 },
  { location: "Tema (1–25)", fee: 50 },
  { location: "Kumasi", fee: 50 },
  { location: "Sunyani", fee: 60 },
  { location: "Tamale", fee: 70 },
];

function formatDeliveryFee(value, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CheckoutPage() {
  const { user, profile } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    address: "",
    city: "",
    region: "",
    country: "Ghana",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([loadCart(user.id), listAddresses(user.id), getStoreSettings()])
      .then(([cart, saved, store]) => {
        setCartItems(cart.items);
        setAddresses(saved);
        setSettings(store);
        if (saved[0])
          setForm({
            full_name: saved[0].full_name,
            phone: saved[0].phone,
            address: saved[0].address,
            city: deliveryOptions.some(
              (option) => option.location === saved[0].city,
            )
              ? saved[0].city
              : "",
            region: saved[0].region,
            country: saved[0].country,
          });
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [user.id]);
  const subtotal = cartItems.reduce((sum, item) => {
    const product = item.products;
    return (
      sum +
      Number(
        product?.sale_price != null &&
          Number(product.sale_price) < Number(product.price)
          ? product.sale_price
          : product?.price || 0,
      ) *
        item.quantity
    );
  }, 0);
  const deliveryFee =
    deliveryOptions.find((option) => option.location === form.city)?.fee ?? 0;
  async function submit(event) {
    event.preventDefault();
    if (!cartItems.length) return setError("Your cart is empty.");
    if (!deliveryOptions.some((option) => option.location === form.city)) {
      return setError(
        "Choose a delivery location to calculate the delivery fee.",
      );
    }
    setBusy(true);
    setError("");
    try {
      const authorizationUrl = await initializePaystackPayment(form);
      window.location.assign(authorizationUrl);
    } catch (reason) {
      setError(
        reason.message ||
          "Unable to place order. Please check stock and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="shell page-space checkout-page">
      <div className="breadcrumbs">
        <Link to="/cart">Shopping bag</Link>
        <span>/</span>
        <b>Checkout</b>
      </div>
      <div className="checkout-heading">
        <span className="eyebrow">ALMOST YOURS</span>
        <h1>Delivery details</h1>
        <p>Enter your delivery details and pay securely online with Paystack.</p>
      </div>
      {loading ? (
        <LoadingBlock rows={2} />
      ) : (
        <form className="checkout-grid" onSubmit={submit}>
          <div className="checkout-form-column">
            <div className="panel">
              <div className="panel-heading">
                <MapPin />
                <div>
                  <h2>Where should we send it?</h2>
                  <p>Enter the delivery details for this order.</p>
                </div>
              </div>
              {addresses.length > 0 && (
                <label>
                  Use a saved address
                  <select
                    onChange={(event) => {
                      const address = addresses.find(
                        (item) => item.id === event.target.value,
                      );
                      if (address)
                        setForm({
                          full_name: address.full_name,
                          phone: address.phone,
                          address: address.address,
                          city: deliveryOptions.some(
                            (option) => option.location === address.city,
                          )
                            ? address.city
                            : "",
                          region: address.region,
                          country: address.country,
                        });
                    }}
                  >
                    <option value="">Enter a new address</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.full_name} · {address.city}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="form-grid">
                {[
                ["full_name", "Full name"],
                ["phone", "Phone number"],
                ["address", "Street address"],
                ["region", "Region"],
                ["country", "Country"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      required
                      value={form[key]}
                      onChange={(event) =>
                        setForm({ ...form, [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <label>
                  Delivery location
                  <select
                    required
                    value={form.city}
                    onChange={(event) =>
                      setForm({ ...form, city: event.target.value })
                    }
                  >
                    <option value="">Choose a delivery location</option>
                    {deliveryOptions.map((option) => (
                      <option key={option.location} value={option.location}>
                        {option.location} —{" "}
                        {formatDeliveryFee(option.fee, settings?.currency_code)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="panel payment-panel">
              <div className="panel-heading">
                <CreditCard />
                <div>
                  <h2>Payment method</h2>
                  <p>Complete your payment securely online with Paystack.</p>
                </div>
              </div>
              <div className="radio-option payment-option">
                <span className="payment-selection-mark" aria-hidden="true">
                  <Check size={13} />
                </span>
                <div className="payment-option-copy">
                  <b>Pay online with Paystack</b>
                  <small>Pay securely by card or mobile money.</small>
                  <div
                    className="mobile-money-options"
                    aria-label="Mobile money options"
                  >
                    <span className="mobile-money-heading">
                      <Smartphone size={13} />
                      Mobile money
                    </span>
                    <span className="mobile-money-brands">
                      <span className="mobile-money-brand mtn">MTN</span>
                      <span className="mobile-money-brand telecel">
                        Telecel
                      </span>
                      <span className="mobile-money-brand airteltigo">
                        AirtelTigo
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Notice message={error} />
          </div>
          <aside className="checkout-summary panel">
            <span className="eyebrow">ORDER SUMMARY</span>
            <h2>
              {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
            </h2>
            {cartItems.map((item) => (
              <div className="checkout-item" key={item.id}>
                <span>
                  {item.products?.name} × {item.quantity}
                </span>
                <b>
                  {formatMoney(
                    Number(
                      item.products?.sale_price != null &&
                        Number(item.products.sale_price) <
                          Number(item.products.price)
                        ? item.products.sale_price
                        : item.products?.price || 0,
                    ) * item.quantity,
                    settings?.currency_code,
                  )}
                </b>
              </div>
            ))}
            <div className="checkout-total-line">
              <span>Subtotal</span>
              <b>{formatMoney(subtotal, settings?.currency_code)}</b>
            </div>
            <div className="checkout-total-line">
              <span>
                Delivery fee
                {form.city && (
                  <small className="delivery-location-summary">
                    {form.city}
                  </small>
                )}
              </span>
              <b>
                {form.city
                  ? formatDeliveryFee(deliveryFee, settings?.currency_code)
                  : "Select location"}
              </b>
            </div>
            <div className="checkout-total-line total">
              <span>Total</span>
              <b>
                {form.city
                  ? formatMoney(subtotal + deliveryFee, settings?.currency_code)
                  : "Select location"}
              </b>
            </div>
            <button
              className="button button-dark button-wide"
              disabled={busy || cartItems.length === 0}
            >
              {busy ? "Connecting to Paystack…" : "Continue to Paystack"}
              <ArrowRight size={17} />
            </button>
            <p className="checkout-policy-links">
              By continuing, you agree to our{" "}
              <Link to="/policies/terms">Terms</Link> and{" "}
              <Link to="/policies/privacy">Privacy Policy</Link>. See our{" "}
              <Link to="/policies/shipping-delivery">Delivery</Link> and{" "}
              <Link to="/policies/refund-returns">Returns</Link> policies.
            </p>
          </aside>
        </form>
      )}
    </section>
  );
}

export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const { refreshCustomerData, user } = useAuth();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const [state, setState] = useState({ loading: true, error: "", order: null });

  useEffect(() => {
    let active = true;
    if (!reference) {
      setState({ loading: false, error: "Paystack reference is missing.", order: null });
      return () => {
        active = false;
      };
    }
    verifyPaystackPayment(reference)
      .then(async (order) => {
        await refreshCustomerData(user.id);
        if (active) setState({ loading: false, error: "", order });
      })
      .catch((reason) => {
        if (active)
          setState({
            loading: false,
            error: reason.message || "We could not confirm this payment.",
            order: null,
          });
      });
    return () => {
      active = false;
    };
  }, [reference]);

  return (
    <section className="shell page-space">
      <div className="auth-card payment-return-card">
        <span className="eyebrow">PAYSTACK PAYMENT</span>
        {state.loading ? (
          <>
            <h1>Confirming your payment</h1>
            <p>Please keep this page open while we verify the transaction.</p>
          </>
        ) : state.order ? (
          <>
            <h1>Payment received</h1>
            <p>Your order {state.order.order_number} is confirmed.</p>
            <div className="payment-confirmed-actions">
              {state.order.id && (
                <Link
                  className="button button-dark"
                  to={`/account/orders/${state.order.id}/receipt`}
                >
                  View receipt <ArrowRight size={16} />
                </Link>
              )}
              <Link className="button button-outline" to="/account/orders">
                View your orders <ArrowRight size={16} />
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1>Payment not confirmed</h1>
            <p>{state.error}</p>
            <Link className="button button-outline" to="/checkout">
              Return to checkout <ArrowRight size={16} />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
