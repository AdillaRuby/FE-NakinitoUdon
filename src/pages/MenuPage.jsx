import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import styles from './MenuPage.module.css'

// image dari API sudah full URL, tidak perlu prefix tambahan
function getImageUrl(image) {
  if (!image) return 'https://placehold.co/300x200/e0e0e0/9e9e9e?text=No+Image'
  if (image.startsWith('http')) return image
  return `http://localhost:3000/uploads/${image}`
}

// ── Cart helpers (localStorage) ──────────────────────────────────────────────
function loadCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] }
}
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart))
}

export default function MenuPage() {
  const { tableNumber } = useParams()
  const navigate = useNavigate()

  const [menus, setMenus] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState(loadCart)
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('customerName') || '')
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [currentBanner, setCurrentBanner] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'Semua' },
    { id: 1, name: 'Makanan' },
    { id: 2, name: 'Minuman' },
  ]

  const banners = [
    { id: 1, image: '/pb1.png', title: 'Promo 1' },
    { id: 2, image: '/pb2.png', title: 'Promo 2' },
    { id: 3, image: '/pb3.png', title: 'Promo 3' },
  ]

  // Auto slide banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [banners.length])
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2000)
  }

  // Tampilkan modal nama jika belum ada
  useEffect(() => {
    if (!customerName) setShowNameModal(true)
  }, [customerName])

  const fetchMenus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/menus', { params: { name: search } })
      const allMenus = res.data.data || []
      // Filter by category
      const filtered = selectedCategory === 'all' 
        ? allMenus 
        : allMenus.filter(m => m.category_id === selectedCategory)
      setMenus(filtered)
    } catch {
      setMenus([])
    } finally {
      setLoading(false)
    }
  }, [search, selectedCategory])

  useEffect(() => {
    const timer = setTimeout(fetchMenus, 300)
    return () => clearTimeout(timer)
  }, [fetchMenus])

  // Simpan cart ke localStorage setiap berubah
  useEffect(() => { saveCart(cart) }, [cart])

  function handleSaveName() {
    if (!nameInput.trim()) { setNameError('Nama tidak boleh kosong'); return }
    localStorage.setItem('customerName', nameInput.trim())
    setCustomerName(nameInput.trim())
    setShowNameModal(false)
    setNameError('')
  }

  function getQty(menuId) {
    return cart.find(i => i.menu_id === menuId)?.quantity || 0
  }

  function addItem(menu) {
    setCart(prev => {
      const existing = prev.find(i => i.menu_id === menu.id)
      if (existing) {
        return prev.map(i => i.menu_id === menu.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { menu_id: menu.id, name: menu.name, price: menu.price, image: menu.image, quantity: 1 }]
    })
  }

  function removeItem(menuId) {
    setCart(prev => {
      const existing = prev.find(i => i.menu_id === menuId)
      if (!existing) return prev
      if (existing.quantity === 1) return prev.filter(i => i.menu_id !== menuId)
      return prev.map(i => i.menu_id === menuId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  function formatPrice(n) {
    return 'Rp ' + Number(n).toLocaleString('id-ID')
  }

  function goToCart() {
    localStorage.setItem('tableNumber', tableNumber)
    navigate('/cart')
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>
              <img src="/logo-nakinito.png" alt="Nakinito Udon" />
            </div>
            <div>
              <h1 className={styles.brandName}>Nakinito Udon</h1>
              <p className={styles.tableInfo}>Meja {tableNumber}</p>
            </div>
          </div>
          {customerName && (
            <div className={styles.customerBadge}>
              <span>👤</span>
              <span>{customerName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Search */}
      <div className={styles.searchWrap}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Cari menu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {/* Banner Carousel */}
      <div className={styles.bannerWrap}>
        <div className={styles.bannerCarousel} style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
          {banners.map((banner, idx) => (
            <div key={banner.id} className={styles.bannerSlide}>
              <img src={banner.image} alt={banner.title} />
            </div>
          ))}
        </div>
        <div className={styles.bannerDots}>
          {banners.map((_, idx) => (
            <button
              key={idx}
              className={`${styles.bannerDot} ${idx === currentBanner ? styles.bannerDotActive : ''}`}
              onClick={() => setCurrentBanner(idx)}
            />
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className={styles.categoryWrap}>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`${styles.categoryBtn} ${selectedCategory === cat.id ? styles.categoryActive : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu List */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.loadingWrap}>
            {[1,2,3,4].map(i => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : menus.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🍽️</span>
            <p>Menu tidak ditemukan</p>
          </div>
        ) : (
          <div className={styles.menuGrid}>
            {menus.map(menu => {
              const qty = getQty(menu.id)
              return (
                <div key={menu.id} className={styles.menuCard}>
                  <div className={styles.menuImgWrap} onClick={() => setSelectedMenu(menu)}>
                    <img
                      src={getImageUrl(menu.image)}
                      alt={menu.name}
                      className={styles.menuImg}
                      onError={e => { e.target.src = 'https://placehold.co/300x200/e0e0e0/9e9e9e?text=No+Image' }}
                    />
                  </div>
                  <div className={styles.menuInfo}>
                    <h3 className={styles.menuName} onClick={() => setSelectedMenu(menu)}>{menu.name}</h3>
                    {menu.description && (
                      <p className={styles.menuDesc}>{menu.description}</p>
                    )}
                    <p className={styles.menuPrice}>{formatPrice(menu.price)}</p>
                  </div>
                  <div className={styles.menuAction}>
                    {qty === 0 ? (
                      <button className={styles.addBtn} onClick={() => addItem(menu)}>
                        +
                      </button>
                    ) : (
                      <div className={styles.qtyControl}>
                        <button className={styles.qtyBtn} onClick={() => removeItem(menu.id)}>−</button>
                        <span className={styles.qtyNum}>{qty}</span>
                        <button className={styles.qtyBtn} onClick={() => addItem(menu)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Cart Bar */}
      {totalItems > 0 && (
        <div className={styles.cartBar} onClick={goToCart}>
          <div className={styles.cartLeft}>
            <span className={styles.cartBadge}>{totalItems}</span>
            <span className={styles.cartLabel}>Lihat Keranjang</span>
          </div>
          <span className={styles.cartTotal}>{formatPrice(totalPrice)}</span>
        </div>
      )}

      {/* Modal Nama Customer */}
      {showNameModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>👋</div>
            <h2 className={styles.modalTitle}>Halo! Siapa namamu?</h2>
            <p className={styles.modalDesc}>Masukkan namamu agar pesanan mudah dikenali</p>
            <input
              className={`${styles.modalInput} ${nameError ? styles.inputError : ''}`}
              type="text"
              placeholder="Nama kamu..."
              value={nameInput}
              onChange={e => { setNameInput(e.target.value); setNameError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              autoFocus
            />
            {nameError && <p className={styles.errorMsg}>{nameError}</p>}
            <button className={styles.modalBtn} onClick={handleSaveName}>
              Mulai Pesan 🍜
            </button>
          </div>
        </div>
      )}

      {/* Modal Detail Menu */}
      {selectedMenu && (
        <div className={styles.modalOverlay} onClick={() => setSelectedMenu(null)}>
          <div className={styles.modalDetail} onClick={e => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setSelectedMenu(null)}>✕</button>
            <div className={styles.modalDetailImg}>
              <img
                src={getImageUrl(selectedMenu.image)}
                alt={selectedMenu.name}
                onError={e => { e.target.src = 'https://placehold.co/400x300/e0e0e0/9e9e9e?text=No+Image' }}
              />
            </div>
            <div className={styles.modalDetailContent}>
              <h2 className={styles.modalDetailName}>{selectedMenu.name}</h2>
              <p className={styles.modalDetailPrice}>{formatPrice(selectedMenu.price)}</p>
              {selectedMenu.description ? (
                <div className={styles.modalDetailDesc}>
                  <h3>Deskripsi</h3>
                  <p>{selectedMenu.description}</p>
                </div>
              ) : (
                <div className={styles.modalDetailDesc}>
                  <p className={styles.noDesc}>Tidak ada deskripsi untuk menu ini.</p>
                </div>
              )}
              <div className={styles.modalDetailActions}>
                {getQty(selectedMenu.id) === 0 ? (
                  <button className={styles.modalAddBtn} onClick={() => { addItem(selectedMenu); setSelectedMenu(null) }}>
                    + Tambah ke Keranjang
                  </button>
                ) : (
                  <div className={styles.modalQtyControl}>
                    <button className={styles.modalQtyBtn} onClick={() => removeItem(selectedMenu.id)}>−</button>
                    <span className={styles.modalQtyNum}>{getQty(selectedMenu.id)}</span>
                    <button className={styles.modalQtyBtn} onClick={() => addItem(selectedMenu)}>+</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
