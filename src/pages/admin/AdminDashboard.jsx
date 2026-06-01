import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import styles from './AdminDashboard.module.css'

const IMAGE_BASE = 'http://localhost:3000/uploads/'

function getImageUrl(image) {
  if (!image) return 'https://placehold.co/40x40/e0e0e0/9e9e9e?text=No'
  if (image.startsWith('http')) return image
  return `${IMAGE_BASE}${image}`
}

function formatPrice(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

function formatDate(str) {
  if (!str) return '-'
  return new Date(str).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('orders')
  
  // Orders state
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({ pending: 0, done: 0, today: 0, revenue: 0 })
  const refreshRef = useRef(null)
  
  // Order detail/edit modal state
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [editingOrder, setEditingOrder] = useState(false)
  const [orderForm, setOrderForm] = useState({ customer_name: '', table_number: '', notes: '' })
  const [savingOrder, setSavingOrder] = useState(false)

  // Menu state
  const [menus, setMenus] = useState([])
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [editingMenu, setEditingMenu] = useState(null)
  const [menuForm, setMenuForm] = useState({ name: '', description: '', price: '', stock: '', category_id: 1, image: null })
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/orders', { params: { page, limit: 20 } })
      const data = res.data.data
      const list = Array.isArray(data) ? data : (data?.orders || data?.data || [])
      const meta = data?.meta || data?.pagination || {}

      setOrders(list)
      setTotalPages(meta.totalPages || meta.total_pages || 1)

      const pending = list.filter(o => o.status !== 'delivered').length
      const done = list.filter(o => o.status === 'delivered').length
      const today = list.filter(o => {
        const d = new Date(o.created_at)
        const now = new Date()
        return d.toDateString() === now.toDateString()
      }).length
      const revenue = list
        .filter(o => o.status === 'delivered')
        .reduce((s, o) => s + (o.total_price || 0), 0)

      setStats({ pending, done, today, revenue })
    } catch (err) {
      console.error('Error fetching orders:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [page])

  async function fetchMenus() {
    setLoading(true)
    try {
      const res = await api.get('/menus')
      setMenus(res.data.data || [])
    } catch {
      setMenus([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeView === 'orders') fetchOrders()
    else if (activeView === 'menu') fetchMenus()
  }, [activeView, fetchOrders])

  useEffect(() => {
    if (activeView === 'orders') {
      refreshRef.current = setInterval(() => fetchOrders(true), 30000)
      return () => clearInterval(refreshRef.current)
    }
  }, [fetchOrders, activeView])

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login', { replace: true })
  }

  // Menu functions
  function openAddMenu() {
    setEditingMenu(null)
    setMenuForm({ name: '', description: '', price: '', stock: '', category_id: 1, image: null })
    setImagePreview(null)
    setError('')
    setShowMenuModal(true)
  }

  function openEditMenu(menu) {
    setEditingMenu(menu)
    setMenuForm({
      name: menu.name,
      description: menu.description || '',
      price: menu.price,
      stock: menu.stock,
      category_id: menu.category_id,
      image: null
    })
    setImagePreview(getImageUrl(menu.image))
    setError('')
    setShowMenuModal(true)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (file) {
      setMenuForm(prev => ({ ...prev, image: file }))
      setImagePreview(URL.createObjectURL(file))
    }
  }

  async function handleSaveMenu() {
    if (!menuForm.name || !menuForm.price) {
      setError('Nama dan harga wajib diisi')
      return
    }
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('name', menuForm.name)
      formData.append('description', menuForm.description)
      formData.append('price', menuForm.price)
      formData.append('stock', menuForm.stock || 0)
      formData.append('category_id', menuForm.category_id)
      if (menuForm.image) formData.append('image', menuForm.image)

      if (editingMenu) {
        await api.put(`/menus/${editingMenu.id}`, formData)
      } else {
        await api.post('/menus', formData)
      }
      setShowMenuModal(false)
      fetchMenus()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan menu')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMenu(id) {
    if (!confirm('Yakin ingin menghapus menu ini?')) return
    try {
      await api.delete(`/menus/${id}`)
      fetchMenus()
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus menu')
    }
  }

  // Order functions
  async function openOrderDetail(order) {
    setSelectedOrder(order)
    setEditingOrder(false)
    setOrderForm({
      customer_name: order.customer_name,
      table_number: order.table_number,
      notes: order.notes || ''
    })
    
    // Fetch order items
    try {
      const res = await api.get(`/orders/${order.id}`)
      const orderData = res.data.data
      setOrderItems(orderData.items || orderData.order_items || [])
    } catch {
      setOrderItems([])
    }
    
    setShowOrderModal(true)
  }

  function enableEditOrder() {
    setEditingOrder(true)
  }

  async function handleUpdateOrder() {
    if (!orderForm.customer_name || !orderForm.table_number) {
      alert('Nama customer dan nomor meja wajib diisi')
      return
    }
    
    setSavingOrder(true)
    try {
      const formData = new FormData()
      formData.append('customer_name', orderForm.customer_name)
      formData.append('table_number', orderForm.table_number)
      formData.append('notes', orderForm.notes)
      
      await api.put(`/orders/${selectedOrder.id}`, formData)
      setShowOrderModal(false)
      fetchOrders()
      alert('Pesanan berhasil diupdate')
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengupdate pesanan')
    } finally {
      setSavingOrder(false)
    }
  }

  async function handleDeleteOrder(id) {
    if (!confirm('Yakin ingin menghapus pesanan ini?')) return
    try {
      const res = await api.delete(`/orders/${id}`)
      console.log('Delete response:', res)
      fetchOrders()
      alert('Pesanan berhasil dihapus')
    } catch (err) {
      console.error('Delete error:', err.response?.data || err)
      alert(err.response?.data?.message || 'Gagal menghapus pesanan')
    }
  }

  async function handleMarkAsDone(order) {
    if (!confirm('Tandai pesanan ini sudah diantar?')) return
    try {
      // Coba kirim sebagai JSON biasa, bukan FormData
      const res = await api.put(`/orders/${order.id}`, { status: 'delivered' })
      console.log('Update response:', res)
      fetchOrders()
      alert('Pesanan berhasil ditandai sebagai sudah diantar')
    } catch (err) {
      console.error('Update error:', err.response?.data || err)
      alert(err.response?.data?.message || 'Gagal mengupdate status pesanan')
    }
  }

  const filtered = orders.filter(o => {
    // Pesanan Baru = semua kecuali delivered
    // Sudah Diantar = status delivered
    const matchTab = activeTab === 'pending' 
      ? o.status !== 'delivered'
      : o.status === 'delivered'
    
    const q = search.toLowerCase()
    const matchSearch = !q || (
      String(o.id).includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      String(o.table_number).includes(q)
    )
    const matchFrom = !dateFrom || new Date(o.created_at) >= new Date(dateFrom)
    const matchTo = !dateTo || new Date(o.created_at) <= new Date(dateTo + 'T23:59:59')
    return matchTab && matchSearch && matchFrom && matchTo
  })

  const pendingCount = orders.filter(o => o.status !== 'delivered').length

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <span className={styles.sidebarEmoji}>🍜</span>
          <div>
            <p className={styles.sidebarName}>Nakinito Udon</p>
            <p className={styles.sidebarRole}>Admin Panel</p>
          </div>
        </div>
        <nav className={styles.sidebarNav}>
          <div
            className={`${styles.navItem} ${activeView === 'orders' ? styles.navActive : ''}`}
            onClick={() => setActiveView('orders')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </div>
          <div
            className={`${styles.navItem} ${activeView === 'menu' ? styles.navActive : ''}`}
            onClick={() => setActiveView('menu')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Menu
          </div>
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {activeView === 'orders' ? (
          <>
            {/* Top Bar */}
            <div className={styles.topBar}>
              <div>
                <h1 className={styles.pageTitle}>Dashboard</h1>
                <p className={styles.pageSubtitle}>Kelola pesanan & transaksi</p>
              </div>
              <button className={styles.refreshBtn} onClick={() => fetchOrders()} title="Refresh">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} ${styles.statBlue}`}>
                <div className={styles.statIcon}>⏳</div>
                <div>
                  <p className={styles.statValue}>{stats.pending}</p>
                  <p className={styles.statLabel}>Pesanan Baru</p>
                </div>
              </div>
              <div className={`${styles.statCard} ${styles.statGreen}`}>
                <div className={styles.statIcon}>✅</div>
                <div>
                  <p className={styles.statValue}>{stats.done}</p>
                  <p className={styles.statLabel}>Sudah Diantar</p>
                </div>
              </div>
              <div className={`${styles.statCard} ${styles.statOrange}`}>
                <div className={styles.statIcon}>📅</div>
                <div>
                  <p className={styles.statValue}>{stats.today}</p>
                  <p className={styles.statLabel}>Pesanan Hari Ini</p>
                </div>
              </div>
              <div className={`${styles.statCard} ${styles.statYellow}`}>
                <div className={styles.statIcon}>💰</div>
                <div>
                  <p className={styles.statValue}>{formatPrice(stats.revenue)}</p>
                  <p className={styles.statLabel}>Pendapatan</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className={styles.filterBar}>
              <div className={styles.searchWrap}>
                <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Cari nama, ID, atau meja..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className={styles.dateFilters}>
                <div className={styles.dateField}>
                  <label className={styles.dateLabel}>Dari</label>
                  <input type="date" className={styles.dateInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className={styles.dateField}>
                  <label className={styles.dateLabel}>Sampai</label>
                  <input type="date" className={styles.dateInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                {(dateFrom || dateTo || search) && (
                  <button className={styles.clearFilter} onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}>
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Pesanan Baru
                {pendingCount > 0 && <span className={styles.tabBadge}>{pendingCount}</span>}
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'done' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('done')}
              >
                Sudah Diantar
              </button>
            </div>

            {/* Table */}
            <div className={styles.tableWrap}>
              {loading ? (
                <div className={styles.loadingCenter}>
                  <div className={styles.spinner} />
                  <p>Memuat data...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>{activeTab === 'pending' ? '🎉' : '📭'}</span>
                  <p>{activeTab === 'pending' ? 'Tidak ada pesanan baru' : 'Belum ada pesanan yang sudah diantar'}</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nama</th>
                      <th>Meja</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Waktu</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => (
                      <tr key={order.id} className={styles.tableRow}>
                        <td className={styles.tdId}>#{order.id}</td>
                        <td className={styles.tdName}>{order.customer_name}</td>
                        <td><span className={styles.tableTag}>Meja {order.table_number}</span></td>
                        <td className={styles.tdTotal}>{formatPrice(order.total_price)}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${order.status === 'delivered' ? styles.badgeDone : styles.badgePending}`}>
                            {order.status === 'delivered' ? '✅ Sudah Diantar' : '⏳ Pesanan Baru'}
                          </span>
                        </td>
                        <td className={styles.tdTime}>{formatDate(order.created_at)}</td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button 
                              className={styles.btnDetail} 
                              onClick={() => openOrderDetail(order)}
                              title="Detail"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            {order.status !== 'delivered' && (
                              <button 
                                className={styles.btnDone} 
                                onClick={() => handleMarkAsDone(order)}
                                title="Tandai Sudah Diantar"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </button>
                            )}
                            <button 
                              className={styles.btnDelete} 
                              onClick={() => handleDeleteOrder(order.id)}
                              title="Hapus"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Prev
                </button>
                <span className={styles.pageInfo}>Halaman {page} / {totalPages}</span>
                <button
                  className={styles.pageBtn}
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Menu Management */}
            <div className={styles.topBar}>
              <div>
                <h1 className={styles.pageTitle}>Manajemen Menu</h1>
                <p className={styles.pageSubtitle}>Kelola menu makanan & minuman</p>
              </div>
              <button className={styles.addBtn} onClick={openAddMenu}>
                + Tambah Menu
              </button>
            </div>

            {loading ? (
              <div className={styles.loadingCenter}>
                <div className={styles.spinner} />
                <p>Memuat data...</p>
              </div>
            ) : (
              <div className={styles.menuGrid}>
                {menus.map(menu => (
                  <div key={menu.id} className={styles.menuCard}>
                    <div className={styles.menuImgWrap}>
                      <img
                        src={getImageUrl(menu.image)}
                        alt={menu.name}
                        onError={e => { e.target.src = 'https://placehold.co/200x150/e0e0e0/9e9e9e?text=No+Image' }}
                      />
                    </div>
                    <div className={styles.menuCardBody}>
                      <h3 className={styles.menuCardName}>{menu.name}</h3>
                      <p className={styles.menuCardDesc}>{menu.description || 'Tidak ada deskripsi'}</p>
                      <div className={styles.menuCardMeta}>
                        <span className={styles.menuCardPrice}>{formatPrice(menu.price)}</span>
                        <span className={styles.menuCardStock}>Stok: {menu.stock}</span>
                      </div>
                      <div className={styles.menuCardActions}>
                        <button className={styles.editBtn} onClick={() => openEditMenu(menu)}>Edit</button>
                        <button className={styles.deleteBtn} onClick={() => handleDeleteMenu(menu.id)}>Hapus</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Menu Modal */}
      {showMenuModal && (
        <div className={styles.modalOverlay} onClick={() => setShowMenuModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingMenu ? 'Edit Menu' : 'Tambah Menu'}</h2>
              <button className={styles.modalClose} onClick={() => setShowMenuModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Nama Menu *</label>
                <input
                  type="text"
                  value={menuForm.name}
                  onChange={e => setMenuForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Udon Spesial"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Deskripsi</label>
                <textarea
                  value={menuForm.description}
                  onChange={e => setMenuForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Deskripsi menu..."
                  rows={3}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Harga *</label>
                  <input
                    type="number"
                    value={menuForm.price}
                    onChange={e => setMenuForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="15000"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Stok</label>
                  <input
                    type="number"
                    value={menuForm.stock}
                    onChange={e => setMenuForm(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="10"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Kategori</label>
                <select
                  value={menuForm.category_id}
                  onChange={e => setMenuForm(prev => ({ ...prev, category_id: Number(e.target.value) }))}
                >
                  <option value={1}>Makanan</option>
                  <option value={2}>Minuman</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Gambar</label>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {imagePreview && (
                  <div className={styles.imagePreview}>
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>
              {error && <div className={styles.errorMsg}>{error}</div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowMenuModal(false)}>Batal</button>
              <button className={styles.saveBtn} onClick={handleSaveMenu} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail/Edit Modal */}
      {showOrderModal && selectedOrder && (
        <div className={styles.modalOverlay} onClick={() => setShowOrderModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Detail Pesanan #{selectedOrder.id}</h2>
              <button className={styles.modalClose} onClick={() => setShowOrderModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {/* Order Info */}
              <div className={styles.orderInfoSection}>
                <div className={styles.formGroup}>
                  <label>Nama Customer</label>
                  {editingOrder ? (
                    <input
                      type="text"
                      value={orderForm.customer_name}
                      onChange={e => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    />
                  ) : (
                    <div className={styles.infoValue}>{selectedOrder.customer_name}</div>
                  )}
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Nomor Meja</label>
                    {editingOrder ? (
                      <input
                        type="text"
                        value={orderForm.table_number}
                        onChange={e => setOrderForm(prev => ({ ...prev, table_number: e.target.value }))}
                      />
                    ) : (
                      <div className={styles.infoValue}>Meja {selectedOrder.table_number}</div>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <div className={styles.infoValue}>
                      <span className={`${styles.statusBadge} ${selectedOrder.status === 'delivered' ? styles.badgeDone : styles.badgePending}`}>
                        {selectedOrder.status === 'delivered' ? '✅ Sudah Diantar' : '⏳ Pesanan Baru'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Catatan</label>
                  {editingOrder ? (
                    <textarea
                      value={orderForm.notes}
                      onChange={e => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                    />
                  ) : (
                    <div className={styles.infoValue}>{selectedOrder.notes || '-'}</div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Waktu Pesanan</label>
                  <div className={styles.infoValue}>{formatDate(selectedOrder.created_at)}</div>
                </div>
              </div>

              {/* Order Items */}
              <div className={styles.itemsSection}>
                <h3 className={styles.sectionTitle}>Item Pesanan</h3>
                {orderItems.length === 0 ? (
                  <p className={styles.emptyText}>Tidak ada item</p>
                ) : (
                  <div className={styles.itemsList}>
                    {orderItems.map((item, idx) => (
                      <div key={idx} className={styles.orderItem}>
                        <div className={styles.orderItemInfo}>
                          <span className={styles.orderItemName}>{item.menu_name || item.name}</span>
                          <span className={styles.orderItemQty}>x{item.quantity}</span>
                        </div>
                        <span className={styles.orderItemPrice}>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className={styles.totalSection}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>{formatPrice(selectedOrder.total_price)}</span>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              {editingOrder ? (
                <>
                  <button className={styles.cancelBtn} onClick={() => setEditingOrder(false)}>Batal</button>
                  <button className={styles.saveBtn} onClick={handleUpdateOrder} disabled={savingOrder}>
                    {savingOrder ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </>
              ) : (
                <>
                  <button className={styles.cancelBtn} onClick={() => setShowOrderModal(false)}>Tutup</button>
                  {o.status !== 'delivered' && (
                    <button className={styles.editOrderBtn} onClick={enableEditOrder}>
                      Edit Pesanan
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
