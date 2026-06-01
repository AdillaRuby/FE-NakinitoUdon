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
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
]

export default function OrderPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [moneyReceived, setMoneyReceived] = useState('')
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
      setOrder(res.data.data)
    } catch {
      setError('Pesanan tidak ditemukan.')
    } finally {
      setLoading(false)
    }
  }

  function formatPrice(n) {
    return 'Rp ' + Number(n).toLocaleString('id-ID')
  }

  const total = order?.total_price || order?.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0
  const received = parseFloat(moneyReceived.replace(/\D/g, '')) || 0
  const change = received - total

  async function handlePay() {
    if (paymentMethod === 'cash' && received < total) {
      setPayError('Uang yang diterima kurang dari total harga.')
      return
    }
    setPaying(true)
    setPayError('')
    try {
      const formData = new FormData()
      formData.append('order_id', id)
      formData.append('payment_method', paymentMethod)
      formData.append('money_received', paymentMethod === 'cash' ? received : total)

      const res = await api.post('/transactions', formData)
      setTransaction(res.data.data)
      setPaid(true)
    } catch (err) {
      setPayError(err.response?.data?.message || 'Gagal memproses pembayaran.')
    } finally {
      setPaying(false)
    }
  }

  function handleMoneyInput(val) {
    const num = val.replace(/\D/g, '')
    setMoneyReceived(num ? Number(num).toLocaleString('id-ID') : '')
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
          <span className={styles.errorIcon}>😕</span>
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

      {/* Success Banner */}
      {paid && (
        <div className={styles.successBanner}>
          <span>✅</span>
          <div>
            <p className={styles.successTitle}>Pembayaran Berhasil!</p>
            <p className={styles.successSub}>Terima kasih, pesananmu sedang diproses</p>
          </div>
        </div>
      )}

      {/* Order Info */}
      <div className={styles.orderCard}>
        <div className={styles.orderHeader}>
          <div>
            <p className={styles.orderId}>#{order?.id}</p>
            <p className={styles.orderCustomer}>{order?.customer_name}</p>
          </div>
          <div className={styles.orderMeta}>
            <span className={styles.tableTag}>Meja {order?.table_number}</span>
            <span className={`${styles.statusTag} ${order?.status === 'pending' ? styles.statusPending : styles.statusDone}`}>
              {order?.status === 'pending' ? '⏳ Pending' : '✅ Selesai'}
            </span>
          </div>
        </div>

        {order?.notes && (
          <div className={styles.notesBox}>
            <span className={styles.notesIcon}>📝</span>
            <span>{order.notes}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Item Pesanan</h2>
        <div className={styles.itemList}>
          {(order?.items || order?.order_items || []).map((item, idx) => (
            <div key={idx} className={styles.orderItem}>
              <div className={styles.itemImgWrap}>
                <img
                  src={getImageUrl(item.image)}
                  alt={item.name || item.menu_name}
                  className={styles.itemImg}
                  onError={e => { e.target.src = 'https://placehold.co/56x56/e0e0e0/9e9e9e?text=No' }}
                />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemName}>{item.name || item.menu_name}</p>
                <p className={styles.itemPrice}>{formatPrice(item.price)} × {item.quantity}</p>
              </div>
              <p className={styles.itemSubtotal}>{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.totalAmount}>{formatPrice(total)}</span>
        </div>
      </div>

      {/* Payment Section */}
      {!paid ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Metode Pembayaran</h2>

          {/* Payment Method */}
          <div className={styles.payMethodGrid}>
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.value}
                className={`${styles.payMethodBtn} ${paymentMethod === m.value ? styles.payMethodActive : ''}`}
                onClick={() => setPaymentMethod(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Cash Input */}
          {paymentMethod === 'cash' && (
            <div className={styles.cashSection}>
              <div className={styles.quickAmounts}>
                {[total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000]
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .slice(0, 4)
                  .map(amt => (
                    <button
                      key={amt}
                      className={`${styles.quickBtn} ${received === amt ? styles.quickBtnActive : ''}`}
                      onClick={() => setMoneyReceived(Number(amt).toLocaleString('id-ID'))}
                    >
                      {formatPrice(amt)}
                    </button>
                  ))}
              </div>

              {received > 0 && change >= 0 && (
                <div className={styles.changeBox}>
                  <span>Kembalian</span>
                  <span className={styles.changeAmount}>{formatPrice(change)}</span>
                </div>
              )}
            </div>
          )}

          {payError && <div className={styles.payError}>{payError}</div>}

          <button
            className={styles.payBtn}
            onClick={handlePay}
            disabled={paying || (paymentMethod === 'cash' && received < total)}
          >
            {paying ? <span className={styles.spinner} /> : 'Konfirmasi Pembayaran'}
          </button>
        </div>
      ) : (
        <div className={styles.section}>
          <div className={styles.receiptBox}>
            <h3 className={styles.receiptTitle}>Struk Pembayaran</h3>
            <div className={styles.receiptRow}>
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
            <div className={styles.receiptRow}>
              <span>Metode</span>
              <span>{PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}</span>
            </div>
            {paymentMethod === 'cash' && (
              <>
                <div className={styles.receiptRow}>
                  <span>Dibayar</span><span>{formatPrice(received)}</span>
                </div>
                <div className={`${styles.receiptRow} ${styles.receiptChange}`}>
                  <span>Kembalian</span><span>{formatPrice(change)}</span>
                </div>
              </>
            )}
          </div>
          <button className={styles.backMenuBtn} onClick={() => navigate(`/menu/${tableNumber}`)}>
            🍜 Pesan Lagi
          </button>
        </div>
      )}
    </div>
  )
}
