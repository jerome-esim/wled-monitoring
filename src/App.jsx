import { useState, useEffect } from 'react'

function App() {
  const [startIp, setStartIp] = useState('192.168.8.10')
  const [endIp, setEndIp] = useState('192.168.8.21')
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fonction pour évaluer le niveau du signal WiFi
  const getSignalQuality = (rssi) => {
    if (rssi >= -50) return { level: 'Excellent', class: 'signal-excellent' }
    if (rssi >= -60) return { level: 'Bon', class: 'signal-good' }
    if (rssi >= -70) return { level: 'Moyen', class: 'signal-medium' }
    if (rssi >= -80) return { level: 'Faible', class: 'signal-weak' }
    return { level: 'Très faible', class: 'signal-bad' }
  }

  // Fonction pour convertir une IP en nombre
  const ipToNumber = (ip) => {
    const parts = ip.split('.')
    return parts.reduce((acc, part, index) => {
      return acc + parseInt(part) * Math.pow(256, 3 - index)
    }, 0)
  }

  // Fonction pour convertir un nombre en IP
  const numberToIp = (num) => {
    return [
      (num >>> 24) & 0xff,
      (num >>> 16) & 0xff,
      (num >>> 8) & 0xff,
      num & 0xff,
    ].join('.')
  }

  // Fonction pour récupérer les informations d'un device WLED
  const fetchWledDevice = async (ip) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout

      // Récupérer les informations et l'état en parallèle
      const [infoResponse, stateResponse] = await Promise.all([
        fetch(`http://${ip}/json/info`, { signal: controller.signal }).catch(() => null),
        fetch(`http://${ip}/json/state`, { signal: controller.signal }).catch(() => null),
      ])

      clearTimeout(timeoutId)

      if (!infoResponse || !stateResponse || !infoResponse.ok || !stateResponse.ok) {
        return {
          ip,
          status: 'offline',
          name: '-',
          version: '-',
          on: false,
          brightness: 0,
          color: null,
          effect: '-',
          rssi: null,
          channel: null,
        }
      }

      const info = await infoResponse.json()
      const state = await stateResponse.json()

      // Extraire la couleur RGB du premier segment
      let color = null
      if (state.seg && state.seg[0] && state.seg[0].col && state.seg[0].col[0]) {
        const rgb = state.seg[0].col[0]
        color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
      }

      return {
        ip,
        status: 'online',
        name: info.name || 'WLED',
        version: info.ver || '-',
        on: state.on || false,
        brightness: state.bri || 0,
        color,
        effect: state.seg && state.seg[0] ? state.seg[0].fx || 0 : 0,
        effectName: state.seg && state.seg[0] && state.seg[0].name ? state.seg[0].name : '-',
        rssi: info.wifi?.rssi || null,
        channel: info.wifi?.channel || null,
      }
    } catch (err) {
      return {
        ip,
        status: 'offline',
        name: '-',
        version: '-',
        on: false,
        brightness: 0,
        color: null,
        effect: '-',
        rssi: null,
        channel: null,
      }
    }
  }

  // Fonction pour scanner la plage d'IP
  const scanNetwork = async (keepExisting = false) => {
    setError(null)
    setLoading(true)
    if (!keepExisting) {
      setDevices([])
    }

    try {
      const startNum = ipToNumber(startIp)
      const endNum = ipToNumber(endIp)

      if (startNum > endNum) {
        setError('L\'adresse IP de début doit être inférieure à l\'adresse IP de fin')
        setLoading(false)
        return
      }

      const ipCount = endNum - startNum + 1
      if (ipCount > 255) {
        setError('La plage d\'IP est trop grande (max 255 adresses)')
        setLoading(false)
        return
      }

      // Générer la liste des IPs à scanner
      const ips = []
      for (let i = startNum; i <= endNum; i++) {
        ips.push(numberToIp(i))
      }

      // Scanner toutes les IPs en parallèle (par lots de 10 pour ne pas surcharger)
      const batchSize = 10
      const results = []

      for (let i = 0; i < ips.length; i += batchSize) {
        const batch = ips.slice(i, i + batchSize)
        const batchResults = await Promise.all(batch.map(ip => fetchWledDevice(ip)))
        results.push(...batchResults)
        setDevices([...results]) // Mise à jour progressive
      }

      setDevices(results)
    } catch (err) {
      setError(`Erreur lors du scan : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Refresh automatique toutes les 10 secondes
  useEffect(() => {
    if (devices.length === 0) return

    const interval = setInterval(() => {
      scanNetwork(true) // Garder les devices existants pendant le refresh
    }, 10000) // 10 secondes

    return () => clearInterval(interval)
  }, [devices.length, startIp, endIp])

  const onlineDevices = devices.filter(d => d.status === 'online')
  const onDevices = onlineDevices.filter(d => d.on)

  return (
    <div className="app">
      <h1>WLED Monitoring</h1>

      <div className="controls">
        <div className="input-group">
          <div className="input-field">
            <label htmlFor="startIp">Adresse IP de début</label>
            <input
              id="startIp"
              type="text"
              value={startIp}
              onChange={(e) => setStartIp(e.target.value)}
              placeholder="192.168.8.10"
              disabled={loading}
            />
          </div>
          <div className="input-field">
            <label htmlFor="endIp">Adresse IP de fin</label>
            <input
              id="endIp"
              type="text"
              value={endIp}
              onChange={(e) => setEndIp(e.target.value)}
              placeholder="192.168.8.21"
              disabled={loading}
            />
          </div>
          <button onClick={scanNetwork} disabled={loading}>
            {loading ? 'Scan en cours...' : 'Scanner'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {devices.length > 0 && (
        <div className="stats">
          <div className="stat-card">
            <div className="stat-value">{devices.length}</div>
            <div className="stat-label">Total scanné</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{onlineDevices.length}</div>
            <div className="stat-label">En ligne</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{onDevices.length}</div>
            <div className="stat-label">Allumé</div>
          </div>
        </div>
      )}

      {loading && <div className="loading">Scan en cours...</div>}

      {!loading && devices.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Adresse IP</th>
                <th>Status</th>
                <th>Nom</th>
                <th>Version</th>
                <th>État</th>
                <th>Luminosité</th>
                <th>Couleur</th>
                <th>Effet</th>
                <th>Signal WiFi</th>
                <th>Canal</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const signalQuality = device.rssi !== null ? getSignalQuality(device.rssi) : null
                return (
                  <tr key={device.ip}>
                    <td>
                      <a
                        href={`http://${device.ip}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ip-link"
                      >
                        {device.ip}
                      </a>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          device.status === 'online' ? 'status-online' : 'status-offline'
                        }`}
                      >
                        {device.status === 'online' ? 'En ligne' : 'Hors ligne'}
                      </span>
                    </td>
                    <td>{device.name}</td>
                    <td>{device.version}</td>
                    <td>{device.on ? '🟢 Allumé' : '⚫ Éteint'}</td>
                    <td>{device.status === 'online' ? `${Math.round((device.brightness / 255) * 100)}%` : '-'}</td>
                    <td>
                      {device.color ? (
                        <span
                          className="color-preview"
                          style={{ backgroundColor: device.color }}
                          title={device.color}
                        />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{device.effectName || device.effect}</td>
                    <td>
                      {signalQuality ? (
                        <span className={`signal-badge ${signalQuality.class}`}>
                          {device.rssi} dBm ({signalQuality.level})
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{device.channel || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && devices.length === 0 && (
        <div className="table-container">
          <div className="no-data">
            Cliquez sur "Scanner" pour rechercher les devices WLED sur votre réseau
          </div>
        </div>
      )}
    </div>
  )
}

export default App
