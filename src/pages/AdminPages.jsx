import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import {
  getAdminSummary,
  listAllOrders,
  listAllReviews,
  listCustomers,
  setReviewApproval,
  updateOrderStatus,
  updateStoreSettings,
} from "../services/admin.js";
import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  saveCategory,
  updateProduct,
  uploadProductImages,
} from "../services/catalog.js";
import { EmptyState, Notice } from "../components/Common.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { formatMoney } from "../utils/money.js";

function PageTitle({ eyebrow = "STORE WORKSPACE", title, detail, action, to }) {
  return (
    <div className="admin-page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {detail && <p>{detail}</p>}
      </div>
      {action && (
        <Link className="button button-dark" to={to}>
          {action}
          <Plus size={16} />
        </Link>
      )}
    </div>
  );
}

function useAdminLoad(loader, dependencies = []) {
  const [state, setState] = useState({
    data: undefined,
    loading: true,
    error: "",
  });
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((value) => value + 1);
  useEffect(() => {
    let active = true;
    setState({ data: undefined, loading: true, error: "" });
    loader()
      .then((data) => active && setState({ data, loading: false, error: "" }))
      .catch(
        (error) =>
          active &&
          setState({
            data: undefined,
            loading: false,
            error: error.message || "Unable to load data.",
          }),
      );
    return () => {
      active = false;
    };
  }, [...dependencies, version]);
  return { ...state, refresh };
}

function Metric({ label, value, icon: Icon, note }) {
  return (
    <article className="metric-card">
      <span className="metric-icon">
        <Icon size={19} />
      </span>
      <span className="metric-label">{label}</span>
      <b className="metric-value">{value}</b>
      <small>{note}</small>
    </article>
  );
}

export function AdminDashboard() {
  const { storeSettings } = useAuth();
  const { data, loading, error } = useAdminLoad(getAdminSummary);
  return (
    <>
      <PageTitle
        title="Good morning."
        detail="A clear view of what’s happening across your store."
      />
      <Notice message={error} />
      {loading ? (
        <div className="metric-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="metric-card metric-loading" key={i} />
          ))}
        </div>
      ) : (
        data && (
          <>
            <div className="metric-grid">
              <Metric
                label="Total products"
                value={data.totalProducts}
                icon={Package}
                note={`${data.activeProducts} currently active`}
              />
              <Metric
                label="Customers"
                value={data.customers}
                icon={Users}
                note="Registered customer profiles"
              />
              <Metric
                label="All orders"
                value={data.orders}
                icon={ShoppingCart}
                note={`${data.pendingOrders} awaiting action`}
              />
              <Metric
                label="Paid revenue"
                value={formatMoney(
                  data.paidRevenue,
                  storeSettings?.currency_code,
                )}
                icon={ArrowUpRight}
                note="Only orders marked paid"
              />
            </div>
            <div className="dashboard-lower">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <span className="eyebrow">LATEST ACTIVITY</span>
                    <h2>Recent orders</h2>
                  </div>
                  <Link className="text-link" to="/admin/orders">
                    All orders <ArrowRight size={15} />
                  </Link>
                </div>
                {data.recentOrders.length ? (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Payment</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentOrders.map((order) => (
                          <tr key={order.id}>
                            <td>
                              <b>{order.order_number}</b>
                            </td>
                            <td>
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <span
                                className={`status-pill status-${order.status}`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td>{order.payment_status}</td>
                            <td>
                              {formatMoney(
                                order.total_amount,
                                storeSettings?.currency_code,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="admin-empty-copy">
                    Orders will appear here when customers check out.
                  </p>
                )}
              </section>
              <aside className="admin-panel low-stock-panel">
                <div className="admin-panel-head">
                  <div>
                    <span className="eyebrow">INVENTORY WATCH</span>
                    <h2>Low stock</h2>
                  </div>
                  <Link
                    className="icon-button"
                    to="/admin/inventory"
                    aria-label="View inventory"
                  >
                    <ArrowRight />
                  </Link>
                </div>
                {data.lowStock.length ? (
                  data.lowStock.map((product) => (
                    <div className="low-stock-row" key={product.id}>
                      <span className="low-stock-dot" />
                      <span>
                        <b>{product.name}</b>
                        <small>{product.sku || "No SKU"}</small>
                      </span>
                      <strong>{product.stock_quantity}</strong>
                    </div>
                  ))
                ) : (
                  <div className="inventory-clear">
                    <Check />
                    All listed products have more than five units.
                  </div>
                )}
              </aside>
            </div>
            <div className="admin-note">
              <ShieldCheck size={17} />
              <span>
                Revenue counts only records where <b>payment_status = paid</b>.
                Payment verification still belongs to a trusted provider
                workflow.
              </span>
            </div>
          </>
        )
      )}
    </>
  );
}

export function AdminProducts() {
  const location = useLocation();
  const { storeSettings } = useAuth();
  const {
    data: products = [],
    loading,
    error,
    refresh,
  } = useAdminLoad(() => listProducts({ admin: true, limit: 300 }));
  const { data: categories = [] } = useAdminLoad(() =>
    listCategories({ admin: true }),
  );
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [message, setMessage] = useState(
    location.state?.saved
      ? "Product saved. Active products are available in the public shop."
      : "",
  );
  const [actionError, setActionError] = useState("");
  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          (!search ||
            `${product.name} ${product.sku || ""}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!categoryId || product.category_id === categoryId) &&
          (activeFilter === "all" ||
            product.is_active === (activeFilter === "active")),
      ),
    [products, search, categoryId, activeFilter],
  );
  async function toggle(product) {
    setMessage("");
    setActionError("");
    try {
      await updateProduct(product.id, { is_active: !product.is_active });
      setMessage(
        product.is_active
          ? "Product deactivated and removed from the public shop."
          : "Product published to the public shop.",
      );
      refresh();
    } catch (reason) {
      setActionError(reason.message);
    }
  }
  async function remove(product) {
    if (
      !window.confirm(
        `Permanently delete “${product.name}”? This also removes related wishlist/cart rows and product image records.`,
      )
    )
      return;
    const imagePaths = (product.product_images || []).map(
      (image) => image.storage_path,
    );
    if (imagePaths.length) {
      const { error: storageError } = await supabase.storage
        .from("product-images")
        .remove(imagePaths);
      if (storageError) throw storageError;
    }
    try {
      await deleteProduct(product.id);
      setMessage("Product deleted.");
      refresh();
    } catch (reason) {
      setActionError(reason.message);
    }
  }
  return (
    <>
      <PageTitle
        title="Products"
        detail="Manage the products published in your storefront."
        action="Add product"
        to="/admin/products/new"
      />
      <Notice message={message} kind="success" />
      <Notice message={actionError || error} />
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            placeholder="Search name or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Every category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(event) => setActiveFilter(event.target.value)}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="results-count">{filtered.length} products</span>
      </div>
      {loading ? (
        <div className="admin-table-skeleton" />
      ) : filtered.length ? (
        <div className="admin-panel data-table-wrap">
          <table className="data-table product-admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-table-name">
                      {product.main_image_url ? (
                        <img src={product.main_image_url} alt="" />
                      ) : (
                        <span>AB</span>
                      )}
                      <div>
                        <b>{product.name}</b>
                        <small>
                          {product.sku || "No SKU"}
                          {product.is_featured ? " · Featured" : ""}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {categories.find(
                      (category) => category.id === product.category_id,
                    )?.name || "Uncategorized"}
                  </td>
                  <td>
                    <b>
                      {formatMoney(
                        product.sale_price ?? product.price,
                        storeSettings?.currency_code,
                      )}
                    </b>
                    {product.sale_price &&
                      product.sale_price < product.price && (
                        <small className="old-price">
                          {formatMoney(
                            product.price,
                            storeSettings?.currency_code,
                          )}
                        </small>
                      )}
                  </td>
                  <td>{product.stock_quantity}</td>
                  <td>
                    <span
                      className={`status-pill ${product.is_active ? "status-active" : "status-inactive"}`}
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        className="button button-small button-outline"
                        to={`/admin/products/${product.id}/edit`}
                      >
                        Edit
                      </Link>
                      <button
                        className="button button-small button-outline"
                        onClick={() => toggle(product)}
                      >
                        {product.is_active ? "Deactivate" : "Publish"}
                      </button>
                      <button
                        className="icon-button subtle-danger"
                        aria-label="Delete product"
                        onClick={() => remove(product)}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No products match"
          detail="Add a product or change the current filters."
          action="Add product"
          to="/admin/products/new"
        />
      )}
    </>
  );
}

const makeSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const blankProduct = {
  name: "",
  slug: "",
  description: "",
  price: "",
  sale_price: "",
  sku: "",
  stock_quantity: "0",
  category_id: "",
  brand: "",
  is_featured: false,
  is_active: false,
  main_image_url: "",
};

export function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(blankProduct);
  const [categories, setCategories] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  useEffect(() => {
    listCategories({ admin: true })
      .then(setCategories)
      .catch((reason) => setError(reason.message));
    if (id)
      listProducts({ admin: true, limit: 300 })
        .then((items) => {
          const product = items.find((item) => item.id === id);
          if (!product) setError("Product not found or unavailable.");
          else {
            setForm(
              Object.fromEntries(
                Object.keys(blankProduct).map((key) => [
                  key,
                  ["is_active", "is_featured"].includes(key)
                    ? Boolean(product[key])
                    : product[key] == null
                      ? ""
                      : String(product[key]),
                ]),
              ),
            );
            setAutoSlug(false);
          }
        })
        .catch((reason) => setError(reason.message))
        .finally(() => setLoading(false));
  }, [id]);
  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    const price = Number(form.price);
    const sale = form.sale_price === "" ? null : Number(form.sale_price);
    const stock = Number(form.stock_quantity);
    if (
      !form.name.trim() ||
      !form.slug.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      (sale !== null && (!Number.isFinite(sale) || sale < 0 || sale > price)) ||
      !Number.isInteger(stock) ||
      stock < 0
    )
      return setError(
        "Check the required fields, price, sale price, and non-negative whole-number stock.",
      );
    setBusy(true);
    let newlyCreatedProductId = null;
    let uploadedImages = [];
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description || null,
        price,
        sale_price: sale,
        sku: form.sku.trim() || null,
        stock_quantity: stock,
        category_id: form.category_id || null,
        brand: form.brand.trim() || null,
        main_image_url: form.main_image_url || null,
        is_featured: Boolean(form.is_featured),
        is_active: Boolean(form.is_active),
      };
      const requestedActive = payload.is_active;
      if (!id && files.length) payload.is_active = false;
      const saved = id
        ? await updateProduct(id, payload)
        : await createProduct(payload);
      if (!id) newlyCreatedProductId = saved.id;
      if (files.length) {
        uploadedImages = await uploadProductImages(saved.id, files);
        if (!saved.main_image_url && uploadedImages[0])
          await updateProduct(saved.id, {
            main_image_url: uploadedImages[0].image_url,
          });
        if (!id && requestedActive)
          await updateProduct(saved.id, { is_active: true });
      }
      navigate("/admin/products", { replace: true, state: { saved: true } });
    } catch (reason) {
      if (uploadedImages.length) {
        const paths = uploadedImages.map((image) => image.storage_path);
        await supabase
          .from("product_images")
          .delete()
          .in("storage_path", paths);
        await supabase.storage.from("product-images").remove(paths);
      }
      if (newlyCreatedProductId) await deleteProduct(newlyCreatedProductId);
      setError(
        reason.message ||
          "Product could not be saved. Check permissions and required fields.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <div className="admin-table-skeleton" />;
  return (
    <>
      <PageTitle
        title={id ? "Edit product" : "Add a product"}
        detail="Product data publishes directly to the storefront when active."
      />
      <Link className="back-link admin-back" to="/admin/products">
        <ArrowRight className="back-arrow" size={15} /> Back to products
      </Link>
      <Notice message={error} />
      <form className="product-editor" onSubmit={submit}>
        <div className="product-editor-main">
          <section className="admin-panel editor-panel">
            <h2>Product information</h2>
            <label>
              Product name
              <input
                required
                value={form.name}
                onChange={(event) => {
                  setField("name", event.target.value);
                  if (autoSlug) setField("slug", makeSlug(event.target.value));
                }}
              />
            </label>
            <div className="form-grid">
              <label>
                Slug
                <input
                  required
                  value={form.slug}
                  onChange={(event) => {
                    setAutoSlug(false);
                    setField("slug", makeSlug(event.target.value));
                  }}
                />
              </label>
              <label>
                SKU
                <input
                  value={form.sku}
                  onChange={(event) => setField("sku", event.target.value)}
                />
              </label>
              <label>
                Brand
                <input
                  value={form.brand}
                  onChange={(event) => setField("brand", event.target.value)}
                />
              </label>
              <label>
                Category
                <select
                  value={form.category_id}
                  onChange={(event) =>
                    setField("category_id", event.target.value)
                  }
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea
                rows="5"
                value={form.description}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
              />
            </label>
          </section>
          <section className="admin-panel editor-panel">
            <h2>Pricing and stock</h2>
            <div className="form-grid">
              <label>
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(event) => setField("price", event.target.value)}
                />
              </label>
              <label>
                Sale price <small>(optional)</small>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sale_price}
                  onChange={(event) =>
                    setField("sale_price", event.target.value)
                  }
                />
              </label>
              <label>
                Stock quantity
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={form.stock_quantity}
                  onChange={(event) =>
                    setField("stock_quantity", event.target.value)
                  }
                />
              </label>
              <label>
                Main image URL
                <input
                  type="url"
                  placeholder="Set automatically from first upload"
                  value={form.main_image_url}
                  onChange={(event) =>
                    setField("main_image_url", event.target.value)
                  }
                />
              </label>
            </div>
          </section>
          <section className="admin-panel editor-panel">
            <div className="editor-section-head">
              <div>
                <h2>Product gallery</h2>
                <p>JPG, PNG, WEBP or AVIF · up to 10 MB per image</p>
              </div>
              <label className="button button-outline file-picker">
                Choose images
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  onChange={(event) =>
                    setFiles(Array.from(event.target.files || []))
                  }
                />
              </label>
            </div>
            {files.length > 0 && (
              <div className="file-preview-list">
                {files.map((file) => (
                  <span key={`${file.name}${file.size}`}>{file.name}</span>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside className="product-editor-side">
          <section className="admin-panel editor-panel">
            <h2>Visibility</h2>
            <label className="toggle-row">
              <span>
                <b>Active product</b>
                <small>Visible in the public shop</small>
              </span>
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(event) =>
                  setField("is_active", event.target.checked)
                }
              />
            </label>
            <label className="toggle-row">
              <span>
                <b>Featured</b>
                <small>Eligible for featured sections</small>
              </span>
              <input
                type="checkbox"
                checked={Boolean(form.is_featured)}
                onChange={(event) =>
                  setField("is_featured", event.target.checked)
                }
              />
            </label>
            <button className="button button-dark button-wide" disabled={busy}>
              {busy
                ? "Saving product…"
                : id
                  ? "Save changes"
                  : "Create product"}
              <Check size={16} />
            </button>
            <Link
              className="button button-outline button-wide"
              to="/admin/products"
            >
              Cancel
            </Link>
          </section>
          <div className="admin-note">
            <ShieldCheck size={16} /> RLS still validates admin permission for
            every database and Storage write.
          </div>
        </aside>
      </form>
    </>
  );
}

export function AdminCategories() {
  const {
    data: categories = [],
    loading,
    error,
    refresh,
  } = useAdminLoad(() => listCategories({ admin: true }));
  const { data: products = [] } = useAdminLoad(() =>
    listProducts({ admin: true, limit: 300 }),
  );
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    is_active: true,
  });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setFormError("");
    try {
      await saveCategory(
        {
          ...form,
          image_url: form.image_url || null,
          description: form.description || null,
        },
        editing,
      );
      setMessage(editing ? "Category updated." : "Category created.");
      setEditing(null);
      setForm({
        name: "",
        slug: "",
        description: "",
        image_url: "",
        is_active: true,
      });
      refresh();
    } catch (reason) {
      setFormError(reason.message);
    }
  }
  function edit(category) {
    setEditing(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image_url: category.image_url || "",
      is_active: category.is_active,
    });
  }
  async function toggle(category) {
    try {
      await saveCategory({ is_active: !category.is_active }, category.id);
      refresh();
    } catch (reason) {
      setFormError(reason.message);
    }
  }
  return (
    <>
      <PageTitle
        title="Categories"
        detail="Manage the dynamic category shortcuts and shop filters."
      />
      <Notice message={message} kind="success" />
      <Notice message={error || formError} />
      <div className="management-split">
        <form className="admin-panel editor-panel" onSubmit={submit}>
          <h2>{editing ? "Edit category" : "Create category"}</h2>
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                  slug: editing ? form.slug : makeSlug(event.target.value),
                })
              }
            />
          </label>
          <label>
            Slug
            <input
              required
              value={form.slug}
              onChange={(event) =>
                setForm({ ...form, slug: makeSlug(event.target.value) })
              }
            />
          </label>
          <label>
            Description
            <textarea
              rows="3"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </label>
          <label>
            Image URL <small>(optional)</small>
            <input
              type="url"
              value={form.image_url}
              onChange={(event) =>
                setForm({ ...form, image_url: event.target.value })
              }
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm({ ...form, is_active: event.target.checked })
              }
            />{" "}
            Active in storefront
          </label>
          <div className="form-button-row">
            <button className="button button-dark">
              {editing ? "Save category" : "Add category"}
            </button>
            {editing && (
              <button
                className="button button-outline"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm({
                    name: "",
                    slug: "",
                    description: "",
                    image_url: "",
                    is_active: true,
                  });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        <section className="admin-panel category-admin-list">
          <div className="admin-panel-head">
            <div>
              <span className="eyebrow">LIVE CATEGORY DATA</span>
              <h2>Store categories</h2>
            </div>
            <span className="results-count">{categories.length}</span>
          </div>
          {loading ? (
            <div className="admin-table-skeleton" />
          ) : categories.length ? (
            categories.map((category) => (
              <article className="category-admin-row" key={category.id}>
                <div className="category-admin-mark">
                  {category.image_url ? (
                    <img src={category.image_url} alt="" />
                  ) : (
                    category.name.slice(0, 1)
                  )}
                </div>
                <div>
                  <b>{category.name}</b>
                  <small>
                    {
                      products.filter(
                        (product) => product.category_id === category.id,
                      ).length
                    }{" "}
                    products · /{category.slug}
                  </small>
                </div>
                <span
                  className={`status-pill ${category.is_active ? "status-active" : "status-inactive"}`}
                >
                  {category.is_active ? "Active" : "Inactive"}
                </span>
                <button
                  className="button button-small button-outline"
                  onClick={() => edit(category)}
                >
                  Edit
                </button>
                <button
                  className="button button-small button-outline"
                  onClick={() => toggle(category)}
                >
                  {category.is_active ? "Hide" : "Show"}
                </button>
              </article>
            ))
          ) : (
            <p className="admin-empty-copy">
              Create the first category to organize the public store.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

const orderStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
export function AdminOrders() {
  const { storeSettings } = useAuth();
  const {
    data: orders = [],
    loading,
    error,
    refresh,
  } = useAdminLoad(listAllOrders);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const filtered = orders.filter((order) =>
    `${order.order_number} ${order.shipping_full_name} ${order.shipping_phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function update(id, status) {
    try {
      await updateOrderStatus(id, status);
      refresh();
    } catch (reason) {
      setActionError(reason.message);
    }
  }
  return (
    <>
      <PageTitle
        title="Orders"
        detail="Review fulfilment details and update operational order status."
      />
      <Notice message={error || actionError} />
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order or customer"
          />
        </label>
        <span className="results-count">{filtered.length} orders</span>
      </div>
      {loading ? (
        <div className="admin-table-skeleton" />
      ) : filtered.length ? (
        <div className="admin-panel data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td>
                    <details className="order-admin-details">
                      <summary>
                        {order.order_number}
                        <ChevronDown size={14} />
                      </summary>
                      <div className="admin-order-expanded">
                        <p>
                          {order.shipping_full_name} · {order.shipping_phone}
                        </p>
                        <p>
                          {order.shipping_address}, {order.shipping_city},{" "}
                          {order.shipping_region}
                        </p>
                        {(order.order_items || []).map((item) => (
                          <div key={item.id}>
                            {item.product_name} × {item.quantity}{" "}
                            <b>{Number(item.subtotal).toFixed(2)}</b>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td>{order.shipping_full_name}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <b>
                      {formatMoney(
                        order.total_amount,
                        storeSettings?.currency_code,
                      )}
                    </b>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${order.payment_status === "paid" ? "status-active" : "status-inactive"}`}
                    >
                      {order.payment_status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={order.status}
                      onChange={(event) => update(order.id, event.target.value)}
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No orders to review"
          detail="New customer orders will show up here."
        />
      )}
    </>
  );
}

export function AdminCustomers() {
  const { data: customers = [], loading, error } = useAdminLoad(listCustomers);
  const { data: orders = [] } = useAdminLoad(listAllOrders);
  const [search, setSearch] = useState("");
  const filtered = customers.filter((customer) =>
    `${customer.full_name} ${customer.email} ${customer.phone || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Customers"
        detail="Customer contact details and order history. Authentication secrets are never exposed."
      />
      <Notice message={error} />
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customers"
          />
        </label>
        <span className="results-count">{filtered.length} customers</span>
      </div>
      {loading ? (
        <div className="admin-table-skeleton" />
      ) : (
        <div className="admin-panel data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const customerOrders = orders.filter(
                  (order) => order.user_id === customer.id,
                );
                return (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-cell">
                        <span className="avatar-initial">
                          {customer.full_name?.slice(0, 1) || "C"}
                        </span>
                        <b>{customer.full_name || "Customer"}</b>
                      </div>
                    </td>
                    <td>{customer.email}</td>
                    <td>{customer.phone || "—"}</td>
                    <td>{customerOrders.length}</td>
                    <td>
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function AdminInventory() {
  const {
    data: products = [],
    loading,
    error,
    refresh,
  } = useAdminLoad(() => listProducts({ admin: true, limit: 500 }));
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = products.filter((product) =>
    `${product.name} ${product.sku || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function updateStock(product, value) {
    const stock = Number(value);
    if (!Number.isInteger(stock) || stock < 0) return;
    try {
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: stock })
        .eq("id", product.id);
      if (updateError) throw updateError;
      setNotice("Stock updated.");
      refresh();
    } catch (reason) {
      setNotice(reason.message);
    }
  }
  return (
    <>
      <PageTitle
        title="Inventory"
        detail="Stock levels are constrained to non-negative whole numbers in the database."
      />
      <Notice message={error || notice} kind={error ? "error" : "success"} />
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a product or SKU"
          />
        </label>
        <span className="inventory-legend">
          <i className="stock-good" /> Healthy <i className="stock-low" /> Low
          (≤5) <i className="stock-zero" /> Out
        </span>
      </div>
      {loading ? (
        <div className="admin-table-skeleton" />
      ) : (
        <div className="admin-panel data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Status</th>
                <th>Stock level</th>
                <th>Update stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <b>{product.name}</b>
                  </td>
                  <td>{product.sku || "—"}</td>
                  <td>
                    {product.stock_quantity === 0 ? (
                      <span className="status-pill status-cancelled">
                        Out of stock
                      </span>
                    ) : product.stock_quantity <= 5 ? (
                      <span className="status-pill status-pending">
                        Low stock
                      </span>
                    ) : (
                      <span className="status-pill status-active">
                        In stock
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="stock-meter">
                      <span
                        style={{
                          width: `${Math.min(product.stock_quantity * 10, 100)}%`,
                        }}
                        className={
                          product.stock_quantity <= 5 ? "meter-low" : ""
                        }
                      />
                    </div>
                    <b>{product.stock_quantity}</b>
                  </td>
                  <td>
                    <StockEditor
                      initial={product.stock_quantity}
                      onSave={(value) => updateStock(product, value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StockEditor({ initial, onSave }) {
  const [value, setValue] = useState(String(initial));
  useEffect(() => setValue(String(initial)), [initial]);
  return (
    <form
      className="stock-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
    >
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="New stock quantity"
      />
      <button className="button button-small button-outline">Save</button>
    </form>
  );
}

export function AdminReviews() {
  const {
    data: reviews = [],
    loading,
    error,
    refresh,
  } = useAdminLoad(listAllReviews);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const filtered = reviews.filter((item) =>
    `${item.products?.name || ""} ${item.review || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function setApproval(item, approved) {
    try {
      await setReviewApproval(item.id, approved);
      refresh();
    } catch (reason) {
      setActionError(reason.message);
    }
  }
  return (
    <>
      <PageTitle
        title="Reviews"
        detail="Review customer feedback before it is shown publicly."
      />
      <Notice message={error || actionError} />
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search review or product"
          />
        </label>
        <span className="results-count">{filtered.length} reviews</span>
      </div>
      {loading ? (
        <div className="admin-table-skeleton" />
      ) : filtered.length ? (
        <div className="review-admin-list">
          {filtered.map((item) => (
            <article className="admin-panel review-admin-card" key={item.id}>
              <div className="review-admin-head">
                <div>
                  <b>{item.products?.name || "Product removed"}</b>
                  <small>
                    {new Date(item.created_at).toLocaleDateString()} ·{" "}
                    {item.rating}/5
                  </small>
                </div>
                <span
                  className={`status-pill ${item.is_approved ? "status-active" : "status-pending"}`}
                >
                  {item.is_approved ? "Approved" : "Pending review"}
                </span>
              </div>
              <p>{item.review || "Rating only, no written comment."}</p>
              <div className="review-actions">
                {!item.is_approved && (
                  <button
                    className="button button-small button-dark"
                    onClick={() => setApproval(item, true)}
                  >
                    <Check size={14} /> Approve
                  </button>
                )}
                <button
                  className="button button-small button-outline"
                  onClick={() => setApproval(item, false)}
                >
                  {item.is_approved ? "Hide review" : "Keep hidden"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No reviews yet"
          detail="Submitted customer reviews will appear here for moderation."
        />
      )}
    </>
  );
}

export function AdminSettings() {
  const {
    data: settings,
    loading,
    error,
    refresh,
  } = useAdminLoad(async () => {
    const { data, error: settingsError } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", true)
      .single();
    if (settingsError) throw settingsError;
    return data;
  });
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);
  async function submit(event) {
    event.preventDefault();
    setSaveError("");
    setNotice("");
    try {
      await updateStoreSettings({
        store_name: form.store_name,
        contact_email: form.contact_email || null,
        phone: form.phone || null,
        address: form.address || null,
        currency_code: form.currency_code,
        delivery_fee: Number(form.delivery_fee),
      });
      setNotice("Store settings saved.");
      refresh();
    } catch (reason) {
      setSaveError(reason.message);
    }
  }
  return (
    <>
      <PageTitle
        title="Store settings"
        detail="These values are stored in the existing store_settings table."
      />
      <Notice message={error || saveError} />
      <Notice message={notice} kind="success" />
      {loading || !form ? (
        <div className="admin-table-skeleton" />
      ) : (
        <form className="settings-layout" onSubmit={submit}>
          <section className="admin-panel editor-panel">
            <div className="panel-heading">
              <Settings2 />
              <div>
                <h2>Store information</h2>
                <p>Shown across checkout and customer support surfaces.</p>
              </div>
            </div>
            <label>
              Store name
              <input
                required
                value={form.store_name}
                onChange={(event) =>
                  setForm({ ...form, store_name: event.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Contact email
                <input
                  type="email"
                  value={form.contact_email || ""}
                  onChange={(event) =>
                    setForm({ ...form, contact_email: event.target.value })
                  }
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phone || ""}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Store address
              <textarea
                rows="3"
                value={form.address || ""}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Currency code
                <input
                  required
                  minLength="3"
                  maxLength="3"
                  pattern="[A-Z]{3}"
                  value={form.currency_code}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      currency_code: event.target.value.toUpperCase(),
                    })
                  }
                />
              </label>
              <label>
                Delivery fee
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.delivery_fee}
                  onChange={(event) =>
                    setForm({ ...form, delivery_fee: event.target.value })
                  }
                />
              </label>
            </div>
            <button className="button button-dark">
              Save store settings <Check size={16} />
            </button>
          </section>
          <aside className="admin-panel settings-limit">
            <CircleAlert />
            <h2>Schema-backed only</h2>
            <p>
              The current schema stores contact details, currency, and delivery
              fee. Low-stock threshold and store announcement fields do not
              exist, so they are not shown as pretend settings.
            </p>
            <p>
              Orders remain unpaid unless a trusted payment process updates
              their status.
            </p>
          </aside>
        </form>
      )}
    </>
  );
}
