import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { getProfile } from "../services/auth.js";
import { listWishlist, loadCart } from "../services/commerce.js";
import { getStoreSettings } from "../services/catalog.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);

  async function refreshCustomerData(userId) {
    try {
      const [{ items }, wishlist] = await Promise.all([
        loadCart(userId),
        listWishlist(userId),
      ]);
      setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
      setWishlistIds(wishlist.map((item) => item.product_id));
    } catch {
      setCartCount(0);
      setWishlistIds([]);
    }
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
            await refreshProfile(nextSession.user.id);
            await refreshCustomerData(nextSession.user.id);
            if (alive) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setCartCount(0);
          setWishlistIds([]);
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
    cartCount,
    wishlistIds,
    storeSettings,
    refreshProfile,
    refreshCustomerData,
    setProfile,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
