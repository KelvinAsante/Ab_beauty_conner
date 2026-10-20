import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { getProfile } from "../services/auth.js";
import {
  addCartItem,
  listWishlist,
  loadCart,
  mergeGuestShoppingData,
  readGuestCart,
  readGuestWishlist,
  saveGuestCart,
  saveGuestWishlist,
  toggleWishlist,
} from "../services/commerce.js";
import { getStoreSettings } from "../services/catalog.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [serverWishlistIds, setServerWishlistIds] = useState([]);
  const [guestCart, setGuestCart] = useState(readGuestCart);
  const [guestWishlist, setGuestWishlist] = useState(readGuestWishlist);
  const [storeSettings, setStoreSettings] = useState(null);

  async function refreshCustomerData(userId) {
    try {
      const [{ items }, wishlist] = await Promise.all([
        loadCart(userId),
        listWishlist(userId),
      ]);
      setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
      setServerWishlistIds(wishlist.map((item) => item.product_id));
    } catch {
      setCartCount(0);
      setServerWishlistIds([]);
    }
  }

  async function addProductToCart(product, quantity = 1) {
    if (session?.user) {
      await addCartItem(session.user.id, product.id, quantity);
      await refreshCustomerData(session.user.id);
      return;
    }
    const existing = guestCart.find((item) => item.product_id === product.id);
    const nextCart = existing
      ? guestCart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
      : [
          ...guestCart,
          {
            id: `guest-${product.id}`,
            product_id: product.id,
            quantity,
            products: product,
          },
        ];
    saveGuestCart(nextCart);
    setGuestCart(nextCart);
  }

  async function toggleProductWishlist(product, currentlySaved) {
    if (session?.user) {
      await toggleWishlist(session.user.id, product.id, currentlySaved);
      await refreshCustomerData(session.user.id);
      return;
    }
    const nextWishlist = currentlySaved
      ? guestWishlist.filter((item) => item.product_id !== product.id)
      : [
          ...guestWishlist,
          {
            id: `guest-wishlist-${product.id}`,
            product_id: product.id,
            products: product,
          },
        ];
    saveGuestWishlist(nextWishlist);
    setGuestWishlist(nextWishlist);
  }

  function setGuestCartItemQuantity(itemId, quantity) {
    const nextCart =
      quantity < 1
        ? guestCart.filter((item) => item.id !== itemId)
        : guestCart.map((item) =>
            item.id === itemId ? { ...item, quantity } : item,
          );
    saveGuestCart(nextCart);
    setGuestCart(nextCart);
  }

  function deleteGuestCartItem(itemId) {
    const nextCart = guestCart.filter((item) => item.id !== itemId);
    saveGuestCart(nextCart);
    setGuestCart(nextCart);
  }

  async function completeAuthentication(userId) {
    await mergeGuestShoppingData(userId);
    setGuestCart(readGuestCart());
    setGuestWishlist(readGuestWishlist());
    await refreshCustomerData(userId);
  }

  async function refreshProfile(userId) {
    if (!userId) {
      setProfile(null);
      return null;
    }
    try {
      const nextProfile = await getProfile(userId);
      setProfile(nextProfile);
      return nextProfile;
    } catch {
      setProfile(null);
      return null;
    }
  }

  useEffect(() => {
    let alive = true;
    getStoreSettings()
      .then((settings) => alive && setStoreSettings(settings))
      .catch(() => {});
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) {
        try {
          await mergeGuestShoppingData(data.session.user.id);
          setGuestCart(readGuestCart());
          setGuestWishlist(readGuestWishlist());
        } catch (error) {
          console.error("Unable to restore guest shopping data.", error);
        }
        await refreshProfile(data.session.user.id);
        await refreshCustomerData(data.session.user.id);
      }
      if (alive) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession?.user) {
          setLoading(true);
          window.setTimeout(async () => {
            try {
              await mergeGuestShoppingData(nextSession.user.id);
              setGuestCart(readGuestCart());
              setGuestWishlist(readGuestWishlist());
            } catch (error) {
              console.error("Unable to restore guest shopping data.", error);
            }
            await refreshProfile(nextSession.user.id);
            await refreshCustomerData(nextSession.user.id);
            if (alive) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setCartCount(0);
          setServerWishlistIds([]);
          setLoading(false);
        }
      },
    );
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    cartCount: session?.user
      ? cartCount
      : guestCart.reduce((sum, item) => sum + item.quantity, 0),
    wishlistIds: session?.user
      ? serverWishlistIds
      : guestWishlist.map((item) => item.product_id),
    guestCart,
    guestWishlist,
    storeSettings,
    refreshProfile,
    refreshCustomerData,
    addProductToCart,
    toggleProductWishlist,
    setGuestCartItemQuantity,
    deleteGuestCartItem,
    completeAuthentication,
    setProfile,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
