import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import styles from './OrderPage.module.css'

const IMAGE_BASE = 'http://localhost:3000/uploads/'

function getImageUrl(image) {
  if (!image) return 'https://placehold.co/56x56/e0e0e0/9e9e9e?text=No'
  if (image.startsWith('http')) return image
  return `${IMAGE_BASE}${image}`
}

const PAYMENT_METHODS = [
  { value: 'qris', label: 'QRIS' },
]

export default function OrderPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [paymentMethod] = useState('qris') // Fixed to QRIS only
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [paid, setPaid] = useState(false)
  const [transaction, setTransaction] = useState(null)

  useEffect(() => {
    fetchOrder()
  }, [id])

  async function fetchOrder() {
    setLoading(true)
    try {
      const res = await api.get(`/orders/${id}`)
      const orderData = res.data.data
      
      // Jika backend tidak return items, ambil dari localStorage
      if (!orderData.items && !orderData.order_items) {
        const lastOrder = JSON.parse(localStorage.getItem('lastOrder') || '{}')
        if (lastOrder.id == id) {
          orderData.items = lastOrder.items
          orderData.subtotal = lastOrder.subtotal
          orderData.ppn = lastOrder.ppn
          orderData.total_price = lastOrder.total
        }
      }
      
      setOrder(orderData)
    } catch {
      setError('Pesanan tidak ditemukan.')
    } finally {
      setLoading(false)
    }
  }

  function formatPrice(n) {
    return 'Rp ' + Number(n).toLocaleString('id-ID')
  }

  const items = order?.items || order?.order_items || []
  
  // Gunakan subtotal/ppn/total dari localStorage jika tersedia (lebih akurat)
  const lastOrder = JSON.parse(localStorage.getItem('lastOrder') || '{}')
  const isCurrentOrder = lastOrder.id == id
  
  const subtotal = isCurrentOrder && lastOrder.subtotal 
    ? lastOrder.subtotal
    : (items.length > 0 
        ? items.reduce((s, i) => s + (i.price * i.quantity), 0)
        : (order?.total_price ? Math.round(order.total_price / 1.11) : 0))
  
  const ppn = isCurrentOrder && lastOrder.ppn
    ? lastOrder.ppn
    : Math.round(subtotal * 0.11)
  
  const total = isCurrentOrder && lastOrder.total
    ? lastOrder.total
    : subtotal + ppn

  async function handlePay() {
    setPaying(true)
    setPayError('')
    try {
      // Gunakan endpoint khusus confirm payment
      const res = await api.post(`/orders/${id}/confirm-payment`, {
        payment_method: 'qris'
      })
      
      setTransaction(res.data.data)
      setPaid(true)
    } catch (err) {
      setPayError(err.response?.data?.message || 'Gagal memproses pembayaran.')
    } finally {
      setPaying(false)
    }
  }

  const tableNumber = localStorage.getItem('tableNumber') || '1'

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCenter}>
          <div className={styles.spinner} />
          <p>Memuat pesanan...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCenter}>
          <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="currentColor" width="72" height="72">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p>{error}</p>
          <button className={styles.backBtn2} onClick={() => navigate(`/menu/${tableNumber}`)}>
            Kembali ke Menu
          </button>
        </div>
      </div>
    )
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
        <h1 className={styles.title}>Detail Pesanan</h1>
        <div style={{ width: 36 }} />
      </header>

      {/* Order Info */}
      <div className={styles.orderInfoCard}>
        <div className={styles.orderInfoHeader}>
          <div className={styles.orderInfoLeft}>
            <div className={styles.orderNumberBadge}>#{order?.id}</div>
            <div>
              <h2 className={styles.orderCustomerName}>{order?.customer_name}</h2>
              <p className={styles.orderTableText}>Meja {order?.table_number}</p>
            </div>
          </div>
          <span className={`${styles.statusBadge} ${order?.status === 'pending' ? styles.statusPending : styles.statusDone}`}>
            {order?.status === 'pending' ? 'Pending' : 'Selesai'}
          </span>
        </div>

        {order?.notes && (
          <div className={styles.orderNotes}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>{order.notes}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className={styles.itemsCard}>
        <div className={styles.cardHeader}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          <h2 className={styles.cardTitle}>Item Pesanan</h2>
        </div>
        <div className={styles.itemsGrid}>
          {items.map((item, idx) => (
            <div key={idx} className={styles.itemCard}>
              <div className={styles.itemCardLeft}>
                <div className={styles.itemNumber}>{idx + 1}</div>
                <div className={styles.itemImgBox}>
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.name || item.menu_name}
                    onError={e => { e.target.src = 'https://placehold.co/56x56/e0e0e0/9e9e9e?text=No' }}
                  />
                </div>
                <div className={styles.itemDetails}>
                  <p className={styles.itemTitle}>{item.name || item.menu_name}</p>
                  <p className={styles.itemQty}>{formatPrice(item.price)} × {item.quantity}</p>
                </div>
              </div>
              <div className={styles.itemTotal}>{formatPrice(item.price * item.quantity)}</div>
            </div>
          ))}
        </div>

        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} item)</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>PPN 11%</span>
            <span>{formatPrice(ppn)}</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryRowTotal}>
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      {!paid ? (
        <div className={styles.paymentCard}>
          <div className={styles.cardHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <h2 className={styles.cardTitle}>Pembayaran QRIS</h2>
          </div>

          <div className={styles.qrisSection}>
            <p className={styles.qrisInstruction}>Scan QR Code di bawah untuk melakukan pembayaran</p>
            <div className={styles.qrisBox}>
              <img src="/qris.png" alt="QRIS Payment" className={styles.qrisImage} />
            </div>
            <div className={styles.qrisAmount}>
              <span className={styles.qrisAmountLabel}>Total Pembayaran</span>
              <span className={styles.qrisAmountValue}>{formatPrice(total)}</span>
            </div>
            <div className={styles.qrisNote}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Setelah pembayaran berhasil, klik tombol konfirmasi di bawah</span>
            </div>
          </div>

          {payError && <div className={styles.errorBox}>{payError}</div>}

          <button
            className={styles.confirmBtn}
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Konfirmasi Pembayaran
              </>
            )}
          </button>
        </div>
      ) : (
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="48" height="48">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>Pembayaran Berhasil!</h2>
          <p className={styles.successText}>Terima kasih, pesananmu sedang diproses</p>

          <div className={styles.receiptCard}>
            <h3 className={styles.receiptTitle}>Rincian Pembayaran</h3>
            <div className={styles.receiptItem}>
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
            <div className={styles.receiptItem}>
              <span>Metode</span>
              <span>QRIS</span>
            </div>
          </div>

          <button className={styles.newOrderBtn} onClick={() => navigate(`/menu/${tableNumber}`)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            Pesan Lagi
          </button>
        </div>
      )}
    </div>
  )
}
