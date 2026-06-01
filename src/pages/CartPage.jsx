import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import styles from './CartPage.module.css'

const IMAGE_BASE = 'http://localhost:3000/uploads/'

function getImageUrl(image) {
  if (!image) return 'https://placehold.co/80x80/e0e0e0/9e9e9e?text=No+Image'
  if (image.startsWith('http')) return image
  return `${IMAGE_BASE}${image}`
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] }
}
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart))
}

export default function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(loadCart)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tableNumber = localStorage.getItem('tableNumber') || '1'
  const customerName = localStorage.getItem('customerName') || 'Customer'

  useEffect(() => { saveCart(cart) }, [cart])

  function addItem(menuId) {
    setCart(prev => prev.map(i => i.menu_id === menuId ? { ...i, quantity: i.quantity + 1 } : i))
  }
  function removeItem(menuId) {
    setCart(prev => {
      const item = prev.find(i => i.menu_id === menuId)
      if (!item) return prev
      if (item.quantity === 1) return prev.filter(i => i.menu_id !== menuId)
      return prev.map(i => i.menu_id === menuId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }
  function deleteItem(menuId) {
    setCart(prev => prev.filter(i => i.menu_id !== menuId))
  }

  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const ppn = Math.round(totalPrice * 0.11)
  const grandTotal = totalPrice + ppn

  function formatPrice(n) {
    return 'Rp ' + Number(n).toLocaleString('id-ID')
  }

  async function handleOrder() {
    if (cart.length === 0) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('table_number', tableNumber)
      formData.append('customer_name', customerName)
      formData.append('notes', notes)
      formData.append('items', JSON.stringify(cart.map(i => ({ menu_id: i.menu_id, quantity: i.quantity }))))

      const res = await api.post('/orders', formData)
      const orderId = res.data.data?.id || res.data.data?.order_id

      // Bersihkan cart setelah order berhasil
      localStorage.removeItem('cart')
      navigate(`/order/${orderId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat pesanan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(`/menu/${tableNumber}`)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className={styles.title}>Keranjang</h1>
        <div style={{ width: 36 }} />
      </header>

      {cart.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🛒</span>
          <h2>Keranjang kosong</h2>
          <p>Yuk tambahkan menu favoritmu!</p>
          <button className={styles.browseBtn} onClick={() => navigate(`/menu/${tableNumber}`)}>
            Lihat Menu
          </button>
        </div>
      ) : (
        <>
          {/* Order Info */}
          <div className={styles.orderInfo}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Meja</span>
              <span className={styles.infoValue}>{tableNumber}</span>
            </div>
            <div className={styles.infoDivider} />
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nama</span>
              <span className={styles.infoValue}>{customerName}</span>
            </div>
          </div>

          {/* Cart Items */}
          <div className={styles.itemList}>
            {cart.map(item => (
              <div key={item.menu_id} className={styles.cartItem}>
                <div className={styles.itemImgWrap}>
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.name}
                    className={styles.itemImg}
                    onError={e => { e.target.src = 'https://placehold.co/80x80/e0e0e0/9e9e9e?text=No+Image' }}
                  />
                </div>
                <div className={styles.itemDetails}>
                  <div className={styles.itemTop}>
                    <h3 className={styles.itemName}>{item.name}</h3>
                    <button className={styles.deleteBtn} onClick={() => deleteItem(item.menu_id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </div>
                  <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
                  <div className={styles.itemBottom}>
                    <div className={styles.qtyControl}>
                      <button className={styles.qtyBtn} onClick={() => removeItem(item.menu_id)}>−</button>
                      <span className={styles.qtyNum}>{item.quantity}</span>
                      <button className={styles.qtyBtn} onClick={() => addItem(item.menu_id)}>+</button>
                    </div>
                    <span className={styles.itemSubtotal}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className={styles.notesSection}>
            <label className={styles.notesLabel}>Catatan (opsional)</label>
            <textarea
              className={styles.notesInput}
              placeholder="Contoh: tidak pakai bawang, level pedas, dll..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Subtotal ({cart.reduce((s,i) => s+i.quantity, 0)} item)</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>PPN 11%</span>
              <span>{formatPrice(ppn)}</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {/* Error */}
          {error && <div className={styles.errorMsg}>{error}</div>}

          {/* Order Button */}
          <div className={styles.orderBtnWrap}>
            <button
              className={styles.orderBtn}
              onClick={handleOrder}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>🍜 Pesan Sekarang</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
