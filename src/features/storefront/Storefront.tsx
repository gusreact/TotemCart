import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, unwrapRows } from '../../services/apiClient'

type Language = 'es' | 'en'
type StoreCategory = {
  id: number
  nombre_es: string
  nombre_en: string
  imagen_url?: string
}
type StoreProduct = {
  id: number
  categoria_id: number
  receta_id?: number | null
  nombre_es: string
  nombre_en: string
  precio: string | number
  imagen_url?: string
  disponible?: boolean | null
}
type StoreRecipe = {
  id: number
  instrucciones_es?: string | null
  instrucciones_en?: string | null
}
type RecipeIngredient = {
  id: number
  nombre_es?: string
  nombre_en?: string
  nombre?: string
  unidad_medida?: string
  cantidad: string | number
  requerido?: boolean
}
type RecipeIngredients = {
  receta_id: number
  materias_primas: RecipeIngredient[]
}
type CartLine = {
  product_id: number
  quantity: number
  materia_prima_ids: number[]
}
const CART_STORAGE_KEY = 'totemcart-checkout-cart'

function readStoredCart(): CartLine[] {
  const storedCart = sessionStorage.getItem(CART_STORAGE_KEY)
  if (!storedCart) return []

  try {
    const parsed: unknown = JSON.parse(storedCart)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((line): line is CartLine => (
      Boolean(line) &&
      typeof line === 'object' &&
      Number.isInteger(line.product_id) &&
      line.product_id > 0 &&
      Number.isInteger(line.quantity) &&
      line.quantity > 0 &&
      Array.isArray(line.materia_prima_ids) &&
      line.materia_prima_ids.every((id: unknown) => Number.isInteger(id) && Number(id) > 0)
    )).map((line) => ({
      ...line,
      materia_prima_ids: [...new Set(line.materia_prima_ids)].sort((a, b) => a - b),
    }))
  } catch {
    return []
  }
}

const copy = {
  es: {
    kicker: 'Comida rica, sin vueltas',
    title: '¿Qué te apetece?',
    chooseLanguage: 'Elige tu idioma',
    categories: 'Categorías',
    products: 'Productos',
    chooseCategory: 'Elige una categoría para empezar',
    back: 'Volver a categorías',
    details: 'Ver instrucciones',
    hideDetails: 'Volver al producto',
    noInstructions: 'No hay instrucciones disponibles.',
    noProducts: 'No hay productos disponibles en esta categoría.',
    loading: 'Preparando el menú…',
    error: 'No pudimos cargar el menú.',
    retry: 'Intentar de nuevo',
    admin: 'Administración',
    spanish: 'Español',
    english: 'English',
    addToCart: 'Agregar al carrito',
    removeFromCart: 'Quitar del carrito',
    cart: 'Carrito',
    cartTitle: 'Tu pedido',
    emptyCart: 'Todavía no agregaste productos.',
    total: 'Total',
    closeCart: 'Cerrar carrito',
    customTitle: 'Personaliza tu pedido',
    customDescription: 'Elige qué ingredientes opcionales incluir.',
    required: 'Requerido',
    optional: 'Opcional',
    addConfigured: 'Agregar al carrito',
    cancel: 'Cancelar',
    checkout: 'Pagar con Mercado Pago',
    startingCheckout: 'Conectando con Mercado Pago…',
    checkoutError: 'No pudimos iniciar el pago. Inténtalo de nuevo.',
  },
  en: {
    kicker: 'Good food, made simple',
    title: 'What are you craving?',
    chooseLanguage: 'Choose your language',
    categories: 'Categories',
    products: 'Products',
    chooseCategory: 'Choose a category to get started',
    back: 'Back to categories',
    details: 'View instructions',
    hideDetails: 'Back to product',
    noInstructions: 'No instructions available.',
    noProducts: 'No available products in this category.',
    loading: 'Preparing the menu…',
    error: 'We could not load the menu.',
    retry: 'Try again',
    admin: 'Admin',
    spanish: 'Español',
    english: 'English',
    addToCart: 'Add to cart',
    removeFromCart: 'Remove from cart',
    cart: 'Cart',
    cartTitle: 'Your order',
    emptyCart: 'You have not added any products yet.',
    total: 'Total',
    closeCart: 'Close cart',
    customTitle: 'Customize your order',
    customDescription: 'Choose which optional ingredients to include.',
    required: 'Required',
    optional: 'Optional',
    addConfigured: 'Add to cart',
    cancel: 'Cancel',
    checkout: 'Pay with Mercado Pago',
    startingCheckout: 'Connecting to Mercado Pago…',
    checkoutError: 'We could not start checkout. Please try again.',
  },
} as const

async function fetchStorefrontData() {
  const [categoryData, productData, recipeData, recipeIngredientData] = await Promise.all([
    apiRequest('/api/categorias', null),
    apiRequest('/api/productos', null),
    apiRequest('/api/recetas', null),
    apiRequest('/api/receta-ingredientes', null),
  ])
  return {
    categories: unwrapRows(categoryData) as StoreCategory[],
    products: unwrapRows(productData) as StoreProduct[],
    recipes: unwrapRows(recipeData) as StoreRecipe[],
    recipeIngredients: unwrapRows(recipeIngredientData) as RecipeIngredients[],
  }
}

export default function Storefront() {
  const [language, setLanguage] = useState<Language | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null)
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [recipes, setRecipes] = useState<StoreRecipe[]>([])
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredients[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flippedProductIds, setFlippedProductIds] = useState<number[]>([])
  const [cartLines, setCartLines] = useState<CartLine[]>(readStoredCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [customizingProduct, setCustomizingProduct] = useState<StoreProduct | null>(null)
  const [selectedMateriaPrimaIds, setSelectedMateriaPrimaIds] = useState<number[]>([])
  const customizationSourceRef = useRef<HTMLButtonElement | null>(null)
  const cartButtonRef = useRef<HTMLButtonElement>(null)

  const loadMenu = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchStorefrontData()
      setCategories(data.categories)
      setProducts(data.products)
      setRecipes(data.recipes)
      setRecipeIngredients(data.recipeIngredients)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Menu request failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const data = await fetchStorefrontData()
        if (!active) return
        setCategories(data.categories)
        setProducts(data.products)
        setRecipes(data.recipes)
        setRecipeIngredients(data.recipeIngredients)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Menu request failed.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const text = language ? copy[language] : copy.es
  const availableProducts = products.filter((product) => product.disponible === true)
  const visibleCategories = categories.filter((category) =>
    availableProducts.some((product) => product.categoria_id === category.id),
  )
  const categoryProducts = selectedCategory
    ? availableProducts.filter((product) => product.categoria_id === selectedCategory.id)
    : []
  const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0)
  const cartTotal = cartLines.reduce((total, line) => {
    const product = products.find((item) => item.id === line.product_id)
    return total + (product ? Number(product.precio) * line.quantity : 0)
  }, 0)
  const customizingIngredients = customizingProduct?.receta_id
    ? recipeIngredients.find((recipe) => recipe.receta_id === customizingProduct.receta_id)?.materias_primas ?? []
    : []

  useEffect(() => {
    if (cartLines.length === 0) {
      sessionStorage.removeItem(CART_STORAGE_KEY)
    } else {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartLines))
    }
  }, [cartLines])

  const startCheckout = async () => {
    if (checkingOut || cartLines.length === 0) return
    setCheckingOut(true)
    setCheckoutError('')
    try {
      const response: unknown = await apiRequest('/api/payments/checkout', null, {
        method: 'POST',
        body: JSON.stringify({
          items: cartLines.map((line) => ({
            product_id: line.product_id,
            quantity: line.quantity,
            materia_prima_ids: line.materia_prima_ids,
          })),
        }),
      })
      const checkoutUrl = response && typeof response === 'object' && 'checkout_url' in response
        ? response.checkout_url
        : undefined
      if (typeof checkoutUrl !== 'string' || !checkoutUrl) {
        throw new Error('El servidor no devolvió la URL de Checkout Pro.')
      }
      const parsedCheckoutUrl = new URL(checkoutUrl)
      if (parsedCheckoutUrl.protocol !== 'https:') {
        throw new Error('El servidor devolvió una URL de pago no segura.')
      }
      window.location.assign(parsedCheckoutUrl.toString())
    } catch (checkoutRequestError) {
      setCheckoutError(checkoutRequestError instanceof Error ? checkoutRequestError.message : text.checkoutError)
      setCheckingOut(false)
    }
  }

  const animateCartAddition = (source: HTMLButtonElement) => {
    const cartTarget = cartButtonRef.current
    if (!cartTarget || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const sourceRect = source.getBoundingClientRect()
    const targetRect = cartTarget.getBoundingClientRect()
    const startX = sourceRect.left + sourceRect.width / 2
    const startY = sourceRect.top + sourceRect.height / 2
    const deltaX = targetRect.left + targetRect.width / 2 - startX
    const deltaY = targetRect.top + targetRect.height / 2 - startY
    const flight = document.createElement('span')
    flight.className = 'cart-flight'
    flight.textContent = '+'
    flight.setAttribute('aria-hidden', 'true')
    flight.style.left = `${startX}px`
    flight.style.top = `${startY}px`
    document.body.append(flight)

    const animation = flight.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(calc(-50% + ${deltaX * 0.46}px), calc(-50% - 118px)) scale(1.18)`, opacity: 0.95, offset: 0.54 },
      { transform: `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0.45)`, opacity: 0, offset: 1 },
    ], { duration: 620, easing: 'cubic-bezier(0.2, 0.7, 0.25, 1)' })
    animation.onfinish = () => flight.remove()
  }

  const addConfiguredProduct = (product: StoreProduct, materiaPrimaIds: number[], source?: HTMLButtonElement) => {
    if (source) animateCartAddition(source)
    const sortedMateriaPrimaIds = [...new Set(materiaPrimaIds)].sort((a, b) => a - b)
    setCartLines((current) => {
      const matchingLine = current.find((line) => (
        line.product_id === product.id &&
        line.materia_prima_ids.length === sortedMateriaPrimaIds.length &&
        line.materia_prima_ids.every((id, index) => id === sortedMateriaPrimaIds[index])
      ))
      if (matchingLine) {
        return current.map((line) => line === matchingLine ? { ...line, quantity: line.quantity + 1 } : line)
      }
      return [...current, { product_id: product.id, quantity: 1, materia_prima_ids: sortedMateriaPrimaIds }]
    })
  }

  const beginAddProduct = (product: StoreProduct, source: HTMLButtonElement) => {
    const materials = product.receta_id
      ? recipeIngredients.find((recipe) => recipe.receta_id === product.receta_id)?.materias_primas ?? []
      : []
    const optionalMaterials = materials.filter((material) => material.requerido === false)
    if (optionalMaterials.length > 0) {
      customizationSourceRef.current = source
      setCustomizingProduct(product)
      setSelectedMateriaPrimaIds(materials.map((material) => material.id))
      return
    }
    addConfiguredProduct(product, materials.map((material) => material.id), source)
  }

  const confirmProductCustomization = () => {
    if (!customizingProduct) return
    addConfiguredProduct(customizingProduct, selectedMateriaPrimaIds, customizationSourceRef.current ?? undefined)
    setCustomizingProduct(null)
    setSelectedMateriaPrimaIds([])
    customizationSourceRef.current = null
  }

  const cancelProductCustomization = () => {
    setCustomizingProduct(null)
    setSelectedMateriaPrimaIds([])
    customizationSourceRef.current = null
  }

  const changeCartLineQuantity = (line: CartLine, change: number) => {
    setCartLines((current) => current.flatMap((currentLine) => {
      if (currentLine !== line) return [currentLine]
      const quantity = currentLine.quantity + change
      return quantity > 0 ? [{ ...currentLine, quantity }] : []
    }))
  }

  const removeLastProductFromCart = (productId: number) => {
    const lastMatchingLine = [...cartLines].reverse().find((line) => line.product_id === productId)
    if (lastMatchingLine) changeCartLineQuantity(lastMatchingLine, -1)
  }

  const productQuantityInCart = (productId: number) => cartLines
    .filter((line) => line.product_id === productId)
    .reduce((total, line) => total + line.quantity, 0)

  const ingredientName = (ingredient: RecipeIngredient) => language === 'en'
    ? ingredient.nombre_en ?? ingredient.nombre_es ?? ingredient.nombre ?? String(ingredient.id)
    : ingredient.nombre_es ?? ingredient.nombre ?? ingredient.nombre_en ?? String(ingredient.id)

  const toggleProduct = (productId: number) => {
    setFlippedProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
  }

  const chooseCategory = (category: StoreCategory) => {
    setSelectedCategory(category)
    setFlippedProductIds([])
  }

  const returnToCategories = () => {
    setSelectedCategory(null)
    setFlippedProductIds([])
  }

  const formatPrice = (price: number) => new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'ARS',
    currencyDisplay: 'narrowSymbol'
  }).format(price)

  return (
    <main className="storefront">
      <section className="storefront-main">
        {language === null ? (
          <div className="language-screen">
            <p className="storefront-kicker">
              <Link className="storefront-brand" to="/" aria-label="TotemCart home">
                <span className="storefront-brand-mark">T</span>
                <span>TotemCart</span>
              </Link>
              <span> · {copy.es.kicker}</span>
              <span> · {copy.en.kicker}</span>
            </p>
            <h1>{copy.es.chooseLanguage}<br /><span>{copy.en.chooseLanguage}</span></h1>
            <div className="language-choice-grid" aria-label="Language selection">
              <button type="button" className="language-choice language-choice-es" onClick={() => setLanguage('es')}>
                <img className="language-flag" src="https://flagcdn.com/w160/es.png" alt="Flag of Spain" />
                <span className="language-name">Español</span>
                <span className="language-hint">Ver menú en español</span>
              </button>
              <button type="button" className="language-choice language-choice-en" onClick={() => setLanguage('en')}>
                <img className="language-flag" src="https://flagcdn.com/w160/us.png" alt="Flag of the United States" />
                <span className="language-name">English</span>
                <span className="language-hint">Browse in English</span>
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="storefront-message" role="status"><span className="storefront-loader" />{text.loading}</div>
        ) : error ? (
          <div className="storefront-message storefront-error" role="alert">
            <h1>{text.error}</h1>
            <p>{error}</p>
            <button type="button" className="storefront-retry" onClick={() => void loadMenu()}>{text.retry}</button>
          </div>
        ) : selectedCategory ? (
          <div className="product-view">
            <LogoAndLanguage language={language} setLanguage={setLanguage} />
            <div className="storefront-heading-row">
              <button type="button" className="storefront-back" onClick={returnToCategories}>
                <span aria-hidden="true">←</span>{text.back}
              </button>
            </div>
            <div className="storefront-heading">
              <h1>{language === 'es' ? selectedCategory.nombre_es : selectedCategory.nombre_en}</h1>
            </div>
            {categoryProducts.length ? (
              <div className="product-grid">
                {categoryProducts.map((product, index) => {
                  const isFlipped = flippedProductIds.includes(product.id)
                  const recipe = recipes.find((item) => item.id === product.receta_id)
                  const instructions = language === 'es' ? recipe?.instrucciones_es : recipe?.instrucciones_en
                  const productName = language === 'es' ? product.nombre_es : product.nombre_en
                  return (
                    <article className={`product-card${isFlipped ? ' is-flipped' : ''}`} key={product.id} style={{ animationDelay: `${index * 45}ms` }}>
                      <div className="product-card-inner">
                        <div className="product-card-face product-card-front">
                          {product.imagen_url ? <img className="product-image" src={product.imagen_url} alt="" /> : <div className="product-image-placeholder" aria-hidden="true"><span>TC</span></div>}
                          <div className="product-card-copy">
                            <h2>{productName}</h2>
                            <strong className="product-price">{formatPrice(Number(product.precio))}</strong>
                            <div className="product-cart-controls" aria-label={`${text.cart}: ${productName}`}>
                              {productQuantityInCart(product.id) > 0 ? (
                                <>
                                  <button type="button" className="quantity-control" aria-label={`${text.removeFromCart}: ${productName}`} title={text.removeFromCart} onClick={() => removeLastProductFromCart(product.id)}>−</button>
                                  <span className="product-quantity" aria-live="polite">{productQuantityInCart(product.id)}</span>
                                </>
                              ) : null}
                              <button
                                type="button"
                                className="quantity-control quantity-add"
                                aria-label={`${text.addToCart}: ${productName}`}
                                title={text.addToCart}
                                onClick={(event) => beginAddProduct(product, event.currentTarget)}
                              >+</button>
                            </div>
                          </div>
                          <button type="button" className="product-info-button" aria-label={`${text.details}: ${productName}`} title={text.details} onClick={() => toggleProduct(product.id)}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
                          </button>
                        </div>
                        <div className="product-card-face product-card-back">
                          <button type="button" className="product-info-button product-info-back" aria-label={text.hideDetails} title={text.hideDetails} onClick={() => toggleProduct(product.id)}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6M9 12h12" /></svg>
                          </button>
                          <p className="product-instructions-label">{text.details}</p>
                          <h2>{productName}</h2>
                          <p className="product-instructions">{instructions?.trim() || text.noInstructions}</p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : <p className="storefront-empty">{text.noProducts}</p>}
          </div>
        ) : (
          <div className="category-view">
            <LogoAndLanguage language={language} setLanguage={setLanguage} />
            <div className="storefront-heading">
              <p className="storefront-kicker">{text.kicker}</p>
              <h1>{text.title}</h1>
              <p className="storefront-subtitle">{text.chooseCategory}</p>
            </div>
            <div className="category-grid">
              {visibleCategories.map((category, index) => (
                <button type="button" className="category-button" key={category.id} onClick={() => chooseCategory(category)} style={{ animationDelay: `${index * 55}ms` }}>
                  {category.imagen_url ? <img src={category.imagen_url} alt="" /> : <span className="category-initial" aria-hidden="true">{(language === 'es' ? category.nombre_es : category.nombre_en).slice(0, 1)}</span>}
                  <span className="category-name">{language === 'es' ? category.nombre_es : category.nombre_en}</span>
                  <span className="category-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
      {language ? (
        <>
          <button
            ref={cartButtonRef}
            type="button"
            className={`store-cart-button${cartOpen ? ' is-open' : ''}`}
            onClick={() => setCartOpen(true)}
            aria-label={`${text.cart}: ${cartCount}`}
            aria-haspopup="dialog"
            aria-expanded={cartOpen}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h2l2.3 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6" />
              <circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
            </svg>
            <span>{text.cart}</span>
            <strong className="store-cart-count" aria-live="polite">{cartCount}</strong>
          </button>
          {cartOpen ? (
            <div className="cart-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}>
              <section className="cart-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-dialog-title" aria-busy={checkingOut}>
                <header className="cart-dialog-header">
                  <div><p className="storefront-kicker">{text.cart}</p><h2 id="cart-dialog-title">{text.cartTitle}</h2></div>
                  <button type="button" className="cart-close-button" onClick={() => setCartOpen(false)} aria-label={text.closeCart}>×</button>
                </header>
                {cartLines.length ? (
                  <>
                    <ul className="cart-items">
                      {cartLines.map((line, index) => {
                        const product = products.find((item) => item.id === line.product_id)
                        if (!product) return null
                        const productName = language === 'es' ? product.nombre_es : product.nombre_en
                        const selectedIngredients = recipeIngredients
                          .find((recipe) => recipe.receta_id === product.receta_id)
                          ?.materias_primas.filter((material) => line.materia_prima_ids.includes(material.id)) ?? []
                        return (
                          <li className="cart-item" key={`${line.product_id}-${line.materia_prima_ids.join('-')}-${index}`}>
                            {product.imagen_url ? <img src={product.imagen_url} alt="" /> : <span className="cart-item-placeholder" aria-hidden="true">TC</span>}
                            <div className="cart-item-details">
                              <strong>{productName}</strong>
                              <span>{formatPrice(Number(product.precio))}</span>
                              {selectedIngredients.length > 0 ? (
                                <small>{selectedIngredients.map(ingredientName).join(', ')}</small>
                              ) : null}
                            </div>
                            <div className="cart-item-controls" aria-label={`${text.cart}: ${productName}`}>
                              <button type="button" className="quantity-control" aria-label={`${text.removeFromCart}: ${productName}`} onClick={() => changeCartLineQuantity(line, -1)} disabled={checkingOut}>−</button>
                              <span aria-live="polite">{line.quantity}</span>
                              <button type="button" className="quantity-control quantity-add" aria-label={`${text.addToCart}: ${productName}`} onClick={() => changeCartLineQuantity(line, 1)} disabled={checkingOut}>+</button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    <footer className="cart-summary"><span>{text.total}</span><strong>{formatPrice(cartTotal)}</strong></footer>
                    {checkoutError ? <p className="checkout-error" role="alert">{checkoutError}</p> : null}
                    <button type="button" className="checkout-button" onClick={() => void startCheckout()} disabled={checkingOut}>
                      {checkingOut ? text.startingCheckout : text.checkout}
                    </button>
                  </>
                ) : <p className="cart-empty">{text.emptyCart}</p>}
              </section>
            </div>
          ) : null}
        </>
      ) : null}
      {customizingProduct ? (
        <div className="ingredient-customization-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) cancelProductCustomization()
        }}>
          <section
            className="ingredient-customization-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ingredient-customization-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') cancelProductCustomization()
            }}
            tabIndex={-1}
          >
            <header className="cart-dialog-header">
              <div>
                <p className="storefront-kicker">{language === 'es' ? customizingProduct.nombre_es : customizingProduct.nombre_en}</p>
                <h2 id="ingredient-customization-title">{text.customTitle}</h2>
              </div>
              <button type="button" className="cart-close-button" onClick={cancelProductCustomization} aria-label={text.cancel}>×</button>
            </header>
            <p className="ingredient-customization-description">{text.customDescription}</p>
            <ul className="ingredient-customization-list">
              {customizingIngredients.map((ingredient) => {
                const required = ingredient.requerido !== false
                const checked = required || selectedMateriaPrimaIds.includes(ingredient.id)
                return (
                  <li key={ingredient.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={required}
                        onChange={(event) => setSelectedMateriaPrimaIds((current) => event.target.checked
                          ? [...current, ingredient.id]
                          : current.filter((id) => id !== ingredient.id))}
                      />
                      <span>{ingredientName(ingredient)}</span>
                    </label>
                    <small>{required ? text.required : text.optional}</small>
                  </li>
                )
              })}
            </ul>
            <footer className="ingredient-customization-actions">
              <button type="button" className="ingredient-cancel-button" onClick={cancelProductCustomization}>{text.cancel}</button>
              <button type="button" className="checkout-button" onClick={confirmProductCustomization}>{text.addConfigured}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  )
}

function LogoAndLanguage({ language, setLanguage }: {
  language: Language
  setLanguage: (language: Language) => void
}) {
  return (
    <div className="storefront-heading-row">
        <div className="current-language">
        <Link className="storefront-brand" to="/" aria-label="TotemCart home">
            <span className="storefront-brand-mark">T</span>
            <span>TotemCart</span>
        </Link>
        </div>
        <button type="button" className="language-switch" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>
        <img src={language === 'es' ? 'https://flagcdn.com/w40/us.png' : 'https://flagcdn.com/w40/es.png'} alt="" />
        </button>
    </div>
  )
}