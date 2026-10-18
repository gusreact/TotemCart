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
type CartQuantities = Record<number, number>

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
  },
} as const

async function fetchStorefrontData() {
  const [categoryData, productData, recipeData] = await Promise.all([
    apiRequest('/api/categorias', null),
    apiRequest('/api/productos', null),
    apiRequest('/api/recetas', null),
  ])
  return {
    categories: unwrapRows(categoryData) as StoreCategory[],
    products: unwrapRows(productData) as StoreProduct[],
    recipes: unwrapRows(recipeData) as StoreRecipe[],
  }
}

export default function Storefront() {
  const [language, setLanguage] = useState<Language | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null)
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [recipes, setRecipes] = useState<StoreRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flippedProductIds, setFlippedProductIds] = useState<number[]>([])
  const [cartQuantities, setCartQuantities] = useState<CartQuantities>({})
  const [cartOpen, setCartOpen] = useState(false)
  const cartButtonRef = useRef<HTMLButtonElement>(null)

  const loadMenu = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchStorefrontData()
      setCategories(data.categories)
      setProducts(data.products)
      setRecipes(data.recipes)
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
  const cartProducts = products.filter((product) => (cartQuantities[product.id] ?? 0) > 0)
  const cartCount = Object.values(cartQuantities).reduce((total, quantity) => total + quantity, 0)
  const cartTotal = cartProducts.reduce((total, product) => total + Number(product.precio) * cartQuantities[product.id], 0)

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

  const changeCartQuantity = (product: StoreProduct, change: number, source?: HTMLButtonElement) => {
    if (change > 0 && source) animateCartAddition(source)
    setCartQuantities((current) => {
      const quantity = Math.max(0, (current[product.id] ?? 0) + change)
      if (quantity === 0) {
        return Object.fromEntries(Object.entries(current).filter(([id]) => Number(id) !== product.id))
      }
      return { ...current, [product.id]: quantity }
    })
  }

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

  const formatPrice = (price: number) => new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US', {
    style: 'currency',
    currency: 'USD',
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
                              {(cartQuantities[product.id] ?? 0) > 0 ? (
                                <>
                                  <button type="button" className="quantity-control" aria-label={`${text.removeFromCart}: ${productName}`} title={text.removeFromCart} onClick={() => changeCartQuantity(product, -1)}>−</button>
                                  <span className="product-quantity" aria-live="polite">{cartQuantities[product.id]}</span>
                                </>
                              ) : null}
                              <button
                                type="button"
                                className="quantity-control quantity-add"
                                aria-label={`${text.addToCart}: ${productName}`}
                                title={text.addToCart}
                                onClick={(event) => changeCartQuantity(product, 1, event.currentTarget)}
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
              <section className="cart-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-dialog-title">
                <header className="cart-dialog-header">
                  <div><p className="storefront-kicker">{text.cart}</p><h2 id="cart-dialog-title">{text.cartTitle}</h2></div>
                  <button type="button" className="cart-close-button" onClick={() => setCartOpen(false)} aria-label={text.closeCart}>×</button>
                </header>
                {cartProducts.length ? (
                  <>
                    <ul className="cart-items">
                      {cartProducts.map((product) => {
                        const productName = language === 'es' ? product.nombre_es : product.nombre_en
                        return (
                          <li className="cart-item" key={product.id}>
                            {product.imagen_url ? <img src={product.imagen_url} alt="" /> : <span className="cart-item-placeholder" aria-hidden="true">TC</span>}
                            <div className="cart-item-details"><strong>{productName}</strong><span>{formatPrice(Number(product.precio))}</span></div>
                            <div className="cart-item-controls" aria-label={`${text.cart}: ${productName}`}>
                              <button type="button" className="quantity-control" aria-label={`${text.removeFromCart}: ${productName}`} onClick={() => changeCartQuantity(product, -1)}>−</button>
                              <span aria-live="polite">{cartQuantities[product.id]}</span>
                              <button type="button" className="quantity-control quantity-add" aria-label={`${text.addToCart}: ${productName}`} onClick={(event) => changeCartQuantity(product, 1, event.currentTarget)}>+</button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    <footer className="cart-summary"><span>{text.total}</span><strong>{formatPrice(cartTotal)}</strong></footer>
                  </>
                ) : <p className="cart-empty">{text.emptyCart}</p>}
              </section>
            </div>
          ) : null}
        </>
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