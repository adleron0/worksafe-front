import { useState, useEffect, useCallback } from "react";

// Definindo o tipo do item do carrinho
export type CartItem = {
  id: number;
  name: string;
  quantity: number;
};
// teste
const CART_STORAGE_KEY = "cart";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Initialize state from localStorage
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Function to add an item to the cart
  const addToCart = useCallback((product: { id: number; name: string }) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => Number(item.id) === Number(product.id));
      if (existingItem) {
        return prevCart.map((item) =>
          Number(item.id) === Number(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { id: product.id, name: product.name, quantity: 1 }];
      }
    });
  }, []);

  // Function to clear the cart
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return { cart, setCart, addToCart, clearCart };
}
