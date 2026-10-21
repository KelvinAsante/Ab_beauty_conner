import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  ExternalLink,
  Home,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Menu,
  Package,
  Phone,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  ShoppingCart,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../state/AuthContext.jsx";

const adminLinks = [
  ["Dashboard", "/admin/dashboard", LayoutDashboard],
  ["Products", "/admin/products", Package],
  ["Categories", "/admin/categories", ShoppingBag],
  ["Orders", "/admin/orders", ShoppingCart],
  ["Customers", "/admin/customers", UserRound],
  ["Inventory", "/admin/inventory", Package],
  ["Reviews", "/admin/reviews", Heart],
  ["Store settings", "/admin/settings", Bell],
];

export function StoreHeader() {
  const { user, profile, cartCount } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setProfileMenuOpen(false), [location.pathname]);
  async function signOut() {
    await supabase.auth.signOut();
    setProfileMenuOpen(false);
    navigate("/");
  }
  function search(event) {
    event.preventDefault();
    navigate(
      `/shop${searchText.trim() ? `?search=${encodeURIComponent(searchText.trim())}` : ""}`,
    );
    setMenuOpen(false);
  }
  return (
    <header className="store-header">
      <div className="header-main shell">
        <button
          className="icon-button mobile-menu-button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <Link className="brand" to="/" aria-label="AB Beauty Conner home">
          <span className="brand-mark">AB</span>
          <span>
            AB Beauty <b>Conner</b>
          </span>
        </Link>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`}>
          <NavLink onClick={() => setMenuOpen(false)} to="/">
            Home
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/about">
            About
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/shop">
            Shop
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/shop?sort=newest">
            New arrivals
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/reviews">
            Reviews
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/faq">
            FAQs
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/contact">
            Contact
          </NavLink>
        </nav>
        <div className="header-actions">
          <div className="profile-menu-wrap">
            <button
              className={`profile-trigger ${user ? "is-signed-in" : ""}`}
              aria-label={
                user ? "Open your profile menu" : "Sign in or create an account"
              }
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((open) => !open)}
            >
              <span className="profile-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  <UserRound size={18} />
                )}
              </span>
              <span className="profile-trigger-copy">
                <small>{user ? "Welcome back" : "Welcome"}</small>
                <b>{user ? profile?.full_name || user.email : "Sign in"}</b>
              </span>
              <ChevronDown className="profile-chevron" size={15} />
            </button>
            {profileMenuOpen && (
              <>
                <button
                  className="profile-menu-scrim"
                  aria-label="Close profile menu"
                  onClick={() => setProfileMenuOpen(false)}
                />
                <div className="profile-dropdown" role="menu">
                  {user ? (
                    <>
                      <div className="profile-dropdown-heading">
                        <span className="profile-avatar profile-avatar-large">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" />
                          ) : (
                            <UserRound size={20} />
                          )}
                        </span>
                        <span>
                          <b>{profile?.full_name || "Welcome back"}</b>
                          <small>{user.email}</small>
                        </span>
                      </div>
                      {profile?.role === "admin" ? (
                        <>
                          <Link role="menuitem" to="/admin/profile">
                            <Settings size={16} /> Edit profile
                          </Link>
                          <Link role="menuitem" to="/admin/dashboard">
                            <LayoutDashboard size={16} /> Admin dashboard
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link role="menuitem" to="/account">
                            <UserRound size={16} /> My profile
                          </Link>
                          <Link role="menuitem" to="/account/orders">
                            <ShoppingBag size={16} /> My orders
                          </Link>
                          <Link role="menuitem" to="/account/addresses">
                            <MapPin size={16} /> Saved addresses
                          </Link>
                          <Link role="menuitem" to="/account/wishlist">
                            <Heart size={16} /> Wishlist
                          </Link>
                        </>
                      )}
                      <button role="menuitem" onClick={signOut}>
                        <LogOut size={16} /> Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="profile-dropdown-heading guest-heading">
                        <span className="profile-avatar profile-avatar-large">
                          <UserRound size={20} />
                        </span>
                        <span>
                          <b>Welcome to AB Beauty Conner</b>
                          <small>Sign in to access your account.</small>
                        </span>
                      </div>
                      <Link role="menuitem" to="/signin">
                        <LogIn size={16} /> Sign in
                      </Link>
                      <Link role="menuitem" to="/signup">
                        <UserRound size={16} /> Create an account
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {user && profile?.role !== "admin" && (
            <Link
              className="icon-button desktop-icon"
              to="/account/wishlist"
              aria-label="Wishlist"
            >
              <Heart />
            </Link>
          )}
          <Link
            className="icon-button cart-action"
            to="/cart"
            aria-label={`Cart, ${cartCount} items`}
          >
            <ShoppingCart />
            {cartCount > 0 && (
              <span className="cart-count">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
      <div className="mobile-search">
        <form className="search-form" onSubmit={search}>
          <Search size={18} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search products, brands and more..."
            aria-label="Search products"
          />
          <button
            type="button"
            aria-label="Open shop filters"
            onClick={() => navigate("/shop")}
          >
            <SlidersHorizontal size={19} />
          </button>
        </form>
      </div>
      <div className="desktop-search-row shell">
        <form className="search-form" onSubmit={search}>
          <Search size={18} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search products, brands and more..."
            aria-label="Search products"
          />
          <button className="button button-dark" type="submit">
            Search
          </button>
        </form>
      </div>
    </header>
  );
}

export function StoreLayout() {
  return (
    <>
      <StoreHeader />
      <main>
        <Outlet />
      </main>
      <StoreFooter />
    </>
  );
}

export function StoreFooter() {
  const { storeSettings } = useAuth();
  const contact = storeSettings?.contact_email;
  return (
    <footer className="store-footer" id="contact">
      <div className="shell footer-grid">
        <div>
          <Link className="brand footer-brand" to="/">
            <span className="brand-mark">AB</span>
            <span>
              AB Beauty <b>Conner</b>
            </span>
          </Link>
          <p>Beauty and personal style, selected with care.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <Link to="/shop">Shop all</Link>
          <Link to="/about">About us</Link>
          <Link to="/reviews">Customer reviews</Link>
          <Link to="/faq">FAQs</Link>
          <Link to="/account/wishlist">Wishlist</Link>
          <Link to="/account/orders">Order history</Link>
        </div>
        <div>
          <h3>Customer care</h3>
          <Link to="/account">My account</Link>
          <Link to="/cart">Shopping bag</Link>
          <Link to="/contact">Contact us</Link>
          <Link to="/faq">Help and FAQs</Link>
        </div>
        <div>
          <h3>Policies</h3>
          <Link to="/policies/terms">Terms and conditions</Link>
          <Link to="/policies/privacy">Privacy policy</Link>
          <Link to="/policies/refund-returns">Refunds and returns</Link>
          <Link to="/policies/shipping-delivery">Shipping and delivery</Link>
          <Link to="/policies/order-cancellation">Order cancellation</Link>
        </div>
        <div>
          <h3>Stay in touch</h3>
          <a className="footer-contact-link" href="tel:+233547767018">
            <Phone size={15} /> 054 776 7018 · Call
          </a>
          <a
            className="footer-contact-link"
            href="https://wa.me/233547767018"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} /> WhatsApp us
          </a>
          <a
            className="footer-contact-link"
            href="https://www.facebook.com/Abbeautyconner"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} /> Facebook · AB Beauty Conner
          </a>
          <a
            className="footer-contact-link"
            href="https://chat.whatsapp.com/KLMSLwtIMR7JwBH3Gze9ss"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} /> Join our WhatsApp group
          </a>
          {contact && (
            <a href={`mailto:${contact}`} className="footer-email">
              {contact} <ArrowUpRight size={15} />
            </a>
          )}
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} AB Beauty Conner</span>
        <span>Online retail · Secure Paystack checkout</span>
      </div>
    </footer>
  );
}

export function AdminLayout() {
  const { profile } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setNavOpen(false), [location.pathname]);
  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${navOpen ? "admin-sidebar-open" : ""}`}>
        <Link className="brand admin-brand" to="/admin/dashboard">
          <span className="brand-mark">AB</span>
          <span>
            AB Beauty <b>Conner</b>
          </span>
        </Link>
        <div className="side-label">STORE MANAGEMENT</div>
        <nav>
          {adminLinks.map(([label, href, Icon]) => (
            <NavLink
              end={href === "/admin/dashboard"}
              key={href}
              to={href}
              className={({ isActive }) =>
                `side-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <button className="side-link signout-link" onClick={signOut}>
          <LogOut size={18} />
          Sign out
        </button>
        <div className="admin-user">
          <span className="avatar-initial">
            {profile?.full_name?.slice(0, 1) || "A"}
          </span>
          <span>
            <b>{profile?.full_name || "Administrator"}</b>
            <small>Store admin</small>
          </span>
          <ChevronDown size={16} />
        </div>
      </aside>
      {navOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <div className="admin-content">
        <header className="admin-topbar">
          <button
            className="icon-button admin-menu-toggle"
            aria-label="Toggle navigation"
            onClick={() => setNavOpen(!navOpen)}
          >
            <Menu />
          </button>
          <div className="admin-breadcrumb">
            <Link to="/admin/dashboard">Workspace</Link>
            <span>/</span>
            <b>AB Beauty Conner</b>
          </div>
          <div className="admin-top-actions">
            <Link to="/" target="_blank" className="store-preview">
              View store <ArrowUpRight size={15} />
            </Link>
            <span className="avatar-initial small-avatar">
              {profile?.full_name?.slice(0, 1) || "A"}
            </span>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
