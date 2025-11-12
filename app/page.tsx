"use client"

import { useState, useEffect, useMemo } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  Activity,
  LogOut,
  Calendar,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Github,
  Linkedin,
  Clock,
  Flame,
  CloudRain,
  Waves,
  CheckCircle2,
  Zap,
  ShieldAlert,
  Siren,
  AlertOctagon,
  Maximize,
  Minimize,
  Skull,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SensorData {
  id?: number
  temperatura: number
  umidade: number
  gas_mq2: number
  status: string
  alerta: boolean
  created_at?: string
}

interface Filters {
  dateStart: string
  dateEnd: string
  tempMin: string
  tempMax: string
  umidadeMin: string
  umidadeMax: string
  gasMin: string
  gasMax: string
  status: string
  alerta: string
}

const ITEMS_PER_PAGE = 25

function getGasStatus(gasValue: number): { level: string; color: string; isCritical: boolean } {
  if (gasValue >= 1200.0) {
    return { level: "CRÍTICO", color: "text-red-600", isCritical: true }
  }
  if (gasValue >= 800.0) {
    return { level: "PERIGO", color: "text-orange-600", isCritical: true }
  }
  if (gasValue >= 400.0) {
    return { level: "ATENÇÃO", color: "text-yellow-600", isCritical: true }
  }
  return { level: "NORMAL", color: "text-green-600", isCritical: false }
}

function getAlertMessage(data: SensorData): string {
  const alerts: string[] = []

  if (data.temperatura >= 50) {
    alerts.push("🔥 Temperatura crítica")
  } else if (data.temperatura >= 40) {
    alerts.push("⚠️ Temperatura elevada")
  } else if (data.temperatura <= 10) {
    alerts.push("❄️ Temperatura muito baixa")
  }

  if (data.umidade > 80) {
    alerts.push("💧 Umidade muito alta")
  } else if (data.umidade < 30) {
    alerts.push("🏜️ Umidade muito baixa")
  }

  const gasStatus = getGasStatus(data.gas_mq2)
  if (gasStatus.isCritical) {
    if (data.gas_mq2 >= 1200.0) {
      alerts.push("☠️ Nível de gás CRÍTICO")
    } else if (data.gas_mq2 >= 800.0) {
      alerts.push("⚠️ Nível de gás PERIGOSO")
    } else if (data.gas_mq2 >= 400.0) {
      alerts.push("⚠️ Gás detectado - ATENÇÃO")
    }
  }

  return alerts.length > 0 ? alerts.join(" | ") : "✅ Tudo normal"
}

function getAlertIcon(data: SensorData) {
  if (data.temperatura > 35) return <Flame className="w-4 h-4 text-orange-600 animate-pulse" />
  if (data.temperatura < 10) return <Waves className="w-4 h-4 text-blue-400 animate-pulse" />
  if (data.umidade > 80) return <CloudRain className="w-4 h-4 text-blue-600 animate-bounce" />

  const gasStatus = getGasStatus(data.gas_mq2)
  if (data.gas_mq2 >= 1200.0) return <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
  if (data.gas_mq2 >= 800.0) return <AlertTriangle className="w-4 h-4 text-orange-600 animate-pulse" />
  if (data.gas_mq2 >= 400.0) return <Zap className="w-4 h-4 text-yellow-600 animate-pulse" />

  return <CheckCircle2 className="w-4 h-4 text-green-600" />
}

function getStatusConfig(status: string) {
  const statusLower = status.toLowerCase()

  if (statusLower === "incendio" || statusLower === "incêndio") {
    return {
      icon: <Flame className="w-8 h-8 text-white" />,
      bgColor: "bg-red-600",
      animation: "animate-fire-intense",
      pulseColor: "bg-red-600",
      label: "INCÊNDIO",
      textColor: "text-red-600",
    }
  }

  if (statusLower === "critico" || statusLower === "crítico") {
    return {
      icon: <Siren className="w-8 h-8 text-white" />,
      bgColor: "bg-orange-600",
      animation: "animate-danger-pulse",
      pulseColor: "bg-orange-600",
      label: "CRÍTICO",
      textColor: "text-orange-600",
    }
  }

  if (statusLower === "perigo") {
    return {
      icon: <AlertOctagon className="w-8 h-8 text-white" />,
      bgColor: "bg-yellow-600",
      animation: "animate-warning-shake",
      pulseColor: "bg-yellow-600",
      label: "PERIGO",
      textColor: "text-yellow-600",
    }
  }

  if (statusLower === "atencao" || statusLower === "atenção") {
    return {
      icon: <ShieldAlert className="w-8 h-8 text-white" />,
      bgColor: "bg-blue-600",
      animation: "animate-attention-blink",
      pulseColor: "bg-blue-600",
      label: "ATENÇÃO",
      textColor: "text-blue-600",
    }
  }

  // Normal
  return {
    icon: <CheckCircle2 className="w-8 h-8 text-white" />,
    bgColor: "bg-green-600",
    animation: "animate-normal-pulse",
    pulseColor: "bg-green-600",
    label: "NORMAL",
    textColor: "text-green-600",
  }
}

export default function Dashboard() {
  const [data, setData] = useState<SensorData[]>([])
  const [latestData, setLatestData] = useState<SensorData | null>(null)
  const [loading, setLoading] = useState(false)
  // CHANGE: Removed tableName state and configuration UI - now using ENV variables only
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    dateStart: "",
    dateEnd: "",
    tempMin: "",
    tempMax: "",
    umidadeMin: "",
    umidadeMax: "",
    gasMin: "",
    gasMax: "",
    status: "all",
    alerta: "all",
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    // CHANGE: Removed localStorage logic and manual setup - using ENV variables directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const tableName = process.env.NEXT_PUBLIC_SUPABASE_TABLE_NAME

    if (supabaseUrl && supabaseKey && tableName) {
      setConnected(true)
      fetchDataWithCredentials(supabaseUrl, supabaseKey, tableName)
    } else {
      setError(
        "Configure as variáveis de ambiente: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e NEXT_PUBLIC_SUPABASE_TABLE_NAME",
      )
    }
  }, [])

  async function fetchDataWithCredentials(url: string, key: string, table: string) {
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowserClient(url, key)

    const { data: sensorData, error: fetchError } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000)

    if (fetchError) {
      setError(`Erro: ${fetchError.message}`)
      setConnected(false)
    } else if (sensorData) {
      setData(sensorData)
      setLatestData(sensorData[0] || null)
      setConnected(true)

      const channel = supabase
        .channel(`${table}_changes`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table,
          },
          (payload) => {
            console.log("[v0] Real-time update received:", payload)
            fetchDataWithCredentials(url, key, table)
          },
        )
        .subscribe((status) => {
          console.log("[v0] Subscription status:", status)
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }
    setLoading(false)
  }

  // CHANGE: Removed fetchData and handleDisconnect functions - no longer needed
  function handleDisconnect() {
    setConnected(false)
    setData([])
    setLatestData(null)
    setError(null)
  }

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Filtro de data
      if (filters.dateStart && row.created_at) {
        const rowDate = new Date(row.created_at)
        const startDate = new Date(filters.dateStart)
        if (rowDate < startDate) return false
      }
      if (filters.dateEnd && row.created_at) {
        const rowDate = new Date(row.created_at)
        const endDate = new Date(filters.dateEnd)
        if (rowDate > endDate) return false
      }

      // Filtro de temperatura
      if (filters.tempMin && row.temperatura < Number.parseFloat(filters.tempMin)) return false
      if (filters.tempMax && row.temperatura > Number.parseFloat(filters.tempMax)) return false

      // Filtro de umidade
      if (filters.umidadeMin && row.umidade < Number.parseFloat(filters.umidadeMin)) return false
      if (filters.umidadeMax && row.umidade > Number.parseFloat(filters.umidadeMax)) return false

      // Filtro de gás
      if (filters.gasMin && row.gas_mq2 < Number.parseFloat(filters.gasMin)) return false
      if (filters.gasMax && row.gas_mq2 > Number.parseFloat(filters.gasMax)) return false

      // Filtro de status
      if (filters.status !== "all" && row.status !== filters.status) return false

      // Filtro de alerta
      if (filters.alerta === "yes" && !row.alerta) return false
      if (filters.alerta === "no" && row.alerta) return false

      return true
    })
  }, [data, filters])

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const clearFilters = () => {
    setFilters({
      dateStart: "",
      dateEnd: "",
      tempMin: "",
      tempMax: "",
      umidadeMin: "",
      umidadeMax: "",
      gasMin: "",
      gasMax: "",
      status: "all",
      alerta: "all",
    })
  }

  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateStart !== "" ||
      filters.dateEnd !== "" ||
      filters.tempMin !== "" ||
      filters.tempMax !== "" ||
      filters.umidadeMin !== "" ||
      filters.umidadeMax !== "" ||
      filters.gasMin !== "" ||
      filters.gasMax !== "" ||
      filters.status !== "all" ||
      filters.alerta !== "all"
    )
  }, [filters])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 transition-all duration-500">
      <style jsx global>{`
        @keyframes smoothFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes smoothPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        @keyframes neonGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.6),
                        0 0 40px rgba(239, 68, 68, 0.4),
                        0 0 60px rgba(239, 68, 68, 0.2),
                        inset 0 0 20px rgba(239, 68, 68, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.8),
                        0 0 60px rgba(239, 68, 68, 0.6),
                        0 0 90px rgba(239, 68, 68, 0.4),
                        inset 0 0 30px rgba(239, 68, 68, 0.2);
          }
        }
        @keyframes slideInDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes shimmerLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fire {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-3px) scale(1.02); }
          50% { transform: translateY(-5px) scale(1.05); }
          75% { transform: translateY(-3px) scale(1.02); }
        }
        @keyframes wave { /* New animation for humidity */
          0%, 100% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(5px) translateY(-2px); }
          50% { transform: translateX(0) translateY(-4px); }
          75% { transform: translateX(-5px) translateY(-2px); }
        }
        @keyframes freeze {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-2deg); }
          75% { transform: rotate(2deg); }
        }
        @keyframes fillUp {
          from { height: 0%; }
          to { height: var(--fill-height); }
        }
        @keyframes gasMask { /* New animation for gas */
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.05) rotate(-3deg); }
          50% { transform: scale(1.1) rotate(3deg); }
          75% { transform: scale(1.05) rotate(-3deg); }
        }
        @keyframes toxicPulse { /* New animation for gas */
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fire-intense {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-5deg); }
          50% { transform: scale(1.15) rotate(5deg); }
          75% { transform: scale(1.1) rotate(-5deg); }
        }
        @keyframes danger-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes warning-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes attention-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes normal-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes mercuryRise { /* New animation for temperature */
          0%, 100% { transform: translateY(2px); }
          50% { transform: translateY(-2px); }
        }
        
        @keyframes waterFlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        
        /* New humidity animation - droplets falling */
        @keyframes dropletFall {
          0% { 
            transform: translateY(-20px) scale(0.5);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% { 
            transform: translateY(20px) scale(1);
            opacity: 0;
          }
        }
        @keyframes waterRipple {
          0% { 
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% { 
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @keyframes gentleWave {
          0%, 100% { 
            transform: translateX(0) scaleY(1);
          }
          25% { 
            transform: translateX(2px) scaleY(1.05);
          }
          50% { 
            transform: translateX(0) scaleY(0.95);
          }
          75% { 
            transform: translateX(-2px) scaleY(1.05);
          }
        }
        
        @keyframes toxicBreath { /* New animation for gas - breathing effect */
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        .animate-smooth-float {
          animation: smoothFloat 3s ease-in-out infinite;
        }
        .animate-smooth-pulse {
          animation: smoothPulse 2s ease-in-out infinite;
        }
        .animate-neon-glow {
          animation: neonGlow 2s ease-in-out infinite;
        }
        .animate-slide-in-down {
          animation: slideInDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-shimmer-line {
          animation: shimmerLine 2s ease-in-out infinite;
        }
        .animate-fire {
          animation: fire 1s ease-in-out infinite;
        }
        .animate-wave { /* Class for new humidity animation */
          animation: wave 2s ease-in-out infinite;
        }
        .animate-freeze {
          animation: freeze 2s ease-in-out infinite;
        }
        .animate-fill {
          animation: fillUp 1s ease-out forwards;
        }
        .animate-gas-mask { /* Class for new gas animation */
          animation: gasMask 2s ease-in-out infinite;
        }
        .animate-toxic-pulse { /* Class for new gas animation */
          animation: toxicPulse 1.5s ease-in-out infinite;
        }
        .animate-fire-intense {
          animation: fire-intense 0.8s ease-in-out infinite;
        }
        .animate-danger-pulse {
          animation: danger-pulse 1s ease-in-out infinite;
        }
        .animate-warning-shake {
          animation: warning-shake 0.5s ease-in-out infinite;
        }
        .animate-attention-blink {
          animation: attention-blink 1.5s ease-in-out infinite;
        }
        .animate-normal-pulse {
          animation: normal-pulse 3s ease-in-out infinite;
        }
        .animate-mercury-rise { /* Class for temperature animation */
          animation: mercuryRise 2s ease-in-out infinite;
        }
        
        .animate-water-flow {
          animation: waterFlow 2.5s ease-in-out infinite;
        }
        
        /* New animation classes for humidity */
        .animate-droplet-fall {
          animation: dropletFall 2s ease-in infinite;
        }
        .animate-water-ripple {
          animation: waterRipple 1.5s ease-out infinite;
        }
        .animate-gentle-wave {
          animation: gentleWave 3s ease-in-out infinite;
        }
        
        .animate-toxic-breath {
          animation: toxicBreath 2s ease-in-out infinite;
        }
      `}</style>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                Monitor de Sensores
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <ThemeToggle />
              {connected && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="transition-all duration-300 hover:scale-105 hover:shadow-lg bg-transparent flex-1 sm:flex-none"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Sair</span>
                      </>
                    ) : (
                      <>
                        <Maximize className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Tela Cheia</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    className="transition-all duration-300 hover:scale-105 hover:shadow-lg bg-transparent flex-1 sm:flex-none"
                  >
                    <LogOut className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Desconectar</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {connected && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-primary animate-smooth-pulse" />
                Dados em Tempo Real
              </h2>
            </div>
          )}

          {connected && latestData?.alerta && (
            <div className="animate-slide-in-down">
              <div
                className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-background border-2 ${
                  getStatusConfig(latestData.status).bgColor === "bg-red-600"
                    ? "border-red-500"
                    : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                      ? "border-orange-500"
                      : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                        ? "border-yellow-500"
                        : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                          ? "border-blue-500"
                          : "border-green-500"
                }`}
                style={{
                  boxShadow:
                    getStatusConfig(latestData.status).bgColor === "bg-red-600"
                      ? "0 0 20px rgba(239, 68, 68, 0.15), 0 0 40px rgba(239, 68, 68, 0.1), 0 0 60px rgba(239, 68, 68, 0.05), inset 0 0 20px rgba(239, 68, 68, 0.02)"
                      : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                        ? "0 0 20px rgba(234, 88, 12, 0.15), 0 0 40px rgba(234, 88, 12, 0.1), 0 0 60px rgba(234, 88, 12, 0.05), inset 0 0 20px rgba(234, 88, 12, 0.02)"
                        : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                          ? "0 0 20px rgba(202, 138, 4, 0.15), 0 0 40px rgba(202, 138, 4, 0.1), 0 0 60px rgba(202, 138, 4, 0.05), inset 0 0 20px rgba(202, 138, 4, 0.02)"
                          : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                            ? "0 0 20px rgba(37, 99, 235, 0.15), 0 0 40px rgba(37, 99, 235, 0.1), 0 0 60px rgba(37, 99, 235, 0.05), inset 0 0 20px rgba(37, 99, 235, 0.02)"
                            : "0 0 20px rgba(22, 163, 74, 0.15), 0 0 40px rgba(22, 163, 74, 0.1), 0 0 60px rgba(22, 163, 74, 0.05), inset 0 0 20px rgba(22, 163, 74, 0.02)",
                }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent animate-shimmer-line ${
                      getStatusConfig(latestData.status).bgColor === "bg-red-600"
                        ? "via-red-500/20"
                        : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                          ? "via-orange-500/20"
                          : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                            ? "via-yellow-500/20"
                            : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                              ? "via-blue-500/20"
                              : "via-green-500/20"
                    }`}
                  />
                </div>

                <div className="relative px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <div className="relative animate-smooth-float">
                        <div
                          className={`absolute inset-0 rounded-full blur-lg opacity-25 animate-smooth-pulse ${
                            getStatusConfig(latestData.status).bgColor === "bg-red-600"
                              ? "bg-red-500"
                              : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                                ? "bg-orange-500"
                                : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                                  ? "bg-yellow-500"
                                  : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                                    ? "bg-blue-500"
                                    : "bg-green-500"
                          }`}
                        />
                        <div
                          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-2xl ${
                            getStatusConfig(latestData.status).bgColor === "bg-red-600"
                              ? "bg-gradient-to-br from-red-600 via-red-500 to-orange-600 shadow-red-500/50"
                              : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                                ? "bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-600 shadow-orange-500/50"
                                : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                                  ? "bg-gradient-to-br from-yellow-600 via-yellow-500 to-orange-500 shadow-yellow-500/50"
                                  : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                                    ? "bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-600 shadow-blue-500/50"
                                    : "bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 shadow-green-500/50"
                          } ${getStatusConfig(latestData.status).animation}`}
                        >
                          {getStatusConfig(latestData.status).icon}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-bold text-2xl sm:text-3xl tracking-tight ${
                          getStatusConfig(latestData.status).bgColor === "bg-red-600"
                            ? "text-red-600 dark:text-red-400"
                            : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                              ? "text-orange-600 dark:text-orange-400"
                              : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                                ? "text-yellow-700 dark:text-yellow-400"
                                : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {getStatusConfig(latestData.status).label}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm mt-2">
                        {getAlertMessage(latestData).split(" - ")[0]}
                      </p>
                    </div>

                    <div
                      className={`flex-shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border backdrop-blur-sm w-full md:w-auto justify-center md:justify-start bg-muted/50 dark:bg-card ${
                        getStatusConfig(latestData.status).bgColor === "bg-red-600"
                          ? "border-red-500/30"
                          : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                            ? "border-orange-500/30"
                            : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                              ? "border-yellow-500/30"
                              : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                                ? "border-blue-500/30"
                                : "border-green-500/30"
                      }`}
                    >
                      <div className="relative">
                        <div
                          className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-smooth-pulse ${
                            getStatusConfig(latestData.status).bgColor === "bg-red-600"
                              ? "bg-red-500"
                              : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                                ? "bg-orange-500"
                                : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                                  ? "bg-yellow-500"
                                  : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                                    ? "bg-blue-500"
                                    : "bg-green-500"
                          }`}
                        />
                        <div
                          className={`absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-ping ${
                            getStatusConfig(latestData.status).bgColor === "bg-red-600"
                              ? "bg-red-500"
                              : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                                ? "bg-orange-500"
                                : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                                  ? "bg-yellow-500"
                                  : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                                    ? "bg-blue-500"
                                    : "bg-green-500"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-sm sm:text-base font-bold ${
                          getStatusConfig(latestData.status).bgColor === "bg-red-600"
                            ? "text-red-700 dark:text-red-400"
                            : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                              ? "text-orange-700 dark:text-orange-400"
                              : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                                ? "text-yellow-700 dark:text-yellow-400"
                                : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                                  ? "text-blue-700 dark:text-blue-400"
                                  : "text-green-700 dark:text-green-400"
                        }`}
                      >
                        Monitorando
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`h-px ${
                    getStatusConfig(latestData.status).bgColor === "bg-red-600"
                      ? "bg-gradient-to-r from-red-600 via-orange-500 to-red-600"
                      : getStatusConfig(latestData.status).bgColor === "bg-orange-600"
                        ? "bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600"
                        : getStatusConfig(latestData.status).bgColor === "bg-yellow-600"
                          ? "bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-600"
                          : getStatusConfig(latestData.status).bgColor === "bg-blue-600"
                            ? "bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600"
                            : "bg-gradient-to-r from-green-600 via-emerald-500 to-green-600"
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* CHANGE: Removed configuration card UI - all config now via ENV */}
        {!connected && error && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-700 border-2 shadow-xl">
            <CardContent className="p-6">
              <div className="bg-destructive/10 border-2 border-destructive text-destructive px-5 py-4 rounded-lg">
                <p className="font-semibold text-base">Erro de Configuração</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-xs mt-2 opacity-80">
                  Certifique-se de configurar todas as variáveis de ambiente necessárias no seu projeto.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {connected && !isFullscreen && (
          <>
            {latestData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Temperature Card */}
                <Card
                  className={`transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden border-2 ${
                    latestData.temperatura > 35
                      ? "border-red-500 shadow-red-500/20"
                      : latestData.temperatura < 10
                        ? "border-blue-400 shadow-blue-400/20"
                        : "border-border shadow-lg"
                  }`}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base font-semibold">Temperatura</CardTitle>
                    <Thermometer
                      className={`w-5 h-5 ${
                        latestData.temperatura > 35
                          ? "text-red-600 animate-pulse"
                          : latestData.temperatura < 10
                            ? "text-blue-400 animate-pulse"
                            : "text-orange-500"
                      }`}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-4xl font-bold mb-2">{latestData.temperatura}°C</div>
                        {latestData.temperatura > 35 && (
                          <Badge variant="destructive" className="text-xs">
                            <Flame className="w-3 h-3 mr-1" /> Crítico
                          </Badge>
                        )}
                        {latestData.temperatura < 10 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          >
                            <Waves className="w-3 h-3 mr-1" /> Muito frio
                          </Badge>
                        )}
                        {latestData.temperatura >= 10 && latestData.temperatura <= 35 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                          >
                            Normal
                          </Badge>
                        )}
                      </div>
                      <div className="relative w-12 h-32 bg-muted rounded-full overflow-hidden border-2 border-border">
                        <div
                          className="absolute bottom-0 w-full transition-all duration-1000 ease-out animate-mercury-rise"
                          style={{
                            "--fill-height": `${Math.min((latestData.temperatura / 50) * 100, 100)}%`,
                            height: `${Math.min((latestData.temperatura / 50) * 100, 100)}%`,
                            background:
                              latestData.temperatura > 35
                                ? "linear-gradient(to top, #dc2626, #f97316, #fbbf24)"
                                : latestData.temperatura < 10
                                  ? "linear-gradient(to top, #3b82f6, #60a5fa, #93c5fd)"
                                  : "linear-gradient(to top, #22c55e, #4ade80, #86efac)",
                          }}
                        />
                        <div
                          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${
                            latestData.temperatura > 35
                              ? "bg-red-600"
                              : latestData.temperatura < 10
                                ? "bg-blue-400"
                                : "bg-green-500"
                          }`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden border-2 ${
                    latestData.umidade > 80
                      ? "border-blue-500 shadow-blue-500/20"
                      : latestData.umidade < 30
                        ? "border-orange-400 shadow-orange-400/20"
                        : "border-border shadow-lg"
                  }`}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base font-semibold">Umidade</CardTitle>
                    <Droplets
                      className={`w-5 h-5 ${
                        latestData.umidade > 80
                          ? "text-blue-600 animate-pulse"
                          : latestData.umidade < 30
                            ? "text-orange-500 animate-pulse"
                            : "text-blue-500"
                      }`}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-4xl font-bold mb-2">{latestData.umidade}%</div>
                        {latestData.umidade > 80 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          >
                            <CloudRain className="w-3 h-3 mr-1" /> Muito alta
                          </Badge>
                        )}
                        {latestData.umidade < 30 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                          >
                            Ar seco
                          </Badge>
                        )}
                        {latestData.umidade >= 30 && latestData.umidade <= 80 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                          >
                            Ideal
                          </Badge>
                        )}
                      </div>
                      <div className="relative w-12 h-32 bg-muted rounded-lg overflow-hidden border-2 border-border">
                        {/* Animated droplets falling */}
                        <div
                          className="absolute top-2 left-1/4 w-1.5 h-1.5 rounded-full bg-blue-400 animate-droplet-fall"
                          style={{ animationDelay: "0s" }}
                        />
                        <div
                          className="absolute top-2 left-2/4 w-1.5 h-1.5 rounded-full bg-blue-400 animate-droplet-fall"
                          style={{ animationDelay: "0.7s" }}
                        />
                        <div
                          className="absolute top-2 left-3/4 w-1.5 h-1.5 rounded-full bg-blue-400 animate-droplet-fall"
                          style={{ animationDelay: "1.4s" }}
                        />

                        {/* Water fill with gentle wave animation */}
                        <div
                          className="absolute bottom-0 w-full transition-all duration-1000 ease-out animate-gentle-wave"
                          style={{
                            height: `${latestData.umidade}%`,
                            background:
                              latestData.umidade > 80
                                ? "linear-gradient(to top, #0ea5e9, #38bdf8, #7dd3fc)"
                                : latestData.umidade < 30
                                  ? "linear-gradient(to top, #f59e0b, #fbbf24, #fcd34d)"
                                  : "linear-gradient(to top, #06b6d4, #22d3ee, #67e8f9)",
                          }}
                        >
                          {/* Ripple effect on water surface */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-blue-300/50 animate-water-ripple" />
                          <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-blue-300/50 animate-water-ripple"
                            style={{ animationDelay: "0.5s" }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden border-2 ${
                    latestData.gas_mq2 >= 1200.0
                      ? "border-red-500 shadow-red-500/20"
                      : latestData.gas_mq2 >= 800.0
                        ? "border-orange-500 shadow-orange-500/20"
                        : latestData.gas_mq2 >= 400.0
                          ? "border-yellow-500 shadow-yellow-500/20"
                          : "border-border shadow-lg"
                  }`}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base font-semibold">Gases Inflamáveis ou Fumaça</CardTitle>
                    <Skull
                      className={`w-5 h-5 ${
                        latestData.gas_mq2 >= 1200.0
                          ? "text-red-600 animate-pulse"
                          : latestData.gas_mq2 >= 800.0
                            ? "text-orange-600 animate-pulse"
                            : latestData.gas_mq2 >= 400.0
                              ? "text-yellow-600 animate-pulse"
                              : "text-gray-500"
                      }`}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-4xl font-bold mb-2">
                          {latestData.gas_mq2} <span className="text-lg text-muted-foreground">ppm</span>
                        </div>
                        {latestData.gas_mq2 >= 1200.0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" /> CRÍTICO
                          </Badge>
                        )}
                        {latestData.gas_mq2 >= 800.0 && latestData.gas_mq2 < 1200.0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" /> PERIGO
                          </Badge>
                        )}
                        {latestData.gas_mq2 >= 400.0 && latestData.gas_mq2 < 800.0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                          >
                            <Skull className="w-3 h-3 mr-1" /> Atenção
                          </Badge>
                        )}
                        {latestData.gas_mq2 < 400.0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                          >
                            Normal
                          </Badge>
                        )}
                      </div>
                      <div className="relative w-16 h-32 flex items-center justify-center">
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-border shadow-lg ${
                            latestData.gas_mq2 >= 400.0 ? "animate-toxic-breath" : ""
                          } ${
                            latestData.gas_mq2 >= 1200.0
                              ? "bg-red-500"
                              : latestData.gas_mq2 >= 800.0
                                ? "bg-orange-500"
                                : latestData.gas_mq2 >= 400.0
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                          }`}
                        >
                          <Skull className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="mt-12 sm:mt-20 pt-8 sm:pt-10 border-t-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 flex items-center gap-3">
                <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                Histórico de Leituras
              </h2>
            </div>

            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-700 border-2 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="flex items-center gap-2">
                      Registros Salvos
                      {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-2 animate-in fade-in zoom-in duration-300">
                          {filteredData.length} filtrados
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="transition-all duration-200 hover:scale-105"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
                  </Button>
                </div>
              </CardHeader>

              {showFilters && (
                <div className="px-6 pb-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="bg-muted/50 rounded-lg p-6 space-y-6 border">
                    <div>
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Período de Tempo
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Data e Hora Inicial (clique para selecionar)
                          </label>
                          <div className="relative">
                            <Input
                              type="datetime-local"
                              value={filters.dateStart}
                              onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                              className="transition-all duration-200 focus:scale-[1.01] focus:ring-2 cursor-pointer"
                              step="60"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Data e Hora Final (clique para selecionar)
                          </label>
                          <div className="relative">
                            <Input
                              type="datetime-local"
                              value={filters.dateEnd}
                              onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
                              className="transition-all duration-200 focus:scale-[1.01] focus:ring-2 cursor-pointer"
                              step="60"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        💡 Dica: Clique no campo para abrir o seletor de data e hora
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-orange-500" />
                          Temperatura (°C)
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Mínima</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={filters.tempMin}
                              onChange={(e) => setFilters({ ...filters, tempMin: e.target.value })}
                              placeholder="Ex: 20"
                              className="transition-all duration-200 focus:scale-[1.01]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Máxima</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={filters.tempMax}
                              onChange={(e) => setFilters({ ...filters, tempMax: e.target.value })}
                              placeholder="Ex: 30"
                              className="transition-all duration-200 focus:scale-[1.01]"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          Umidade (%)
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Mínima</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={filters.umidadeMin}
                              onChange={(e) => setFilters({ ...filters, umidadeMin: e.target.value })}
                              placeholder="Ex: 40"
                              className="transition-all duration-200 focus:scale-[1.01]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Máxima</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={filters.umidadeMax}
                              onChange={(e) => setFilters({ ...filters, umidadeMax: e.target.value })}
                              placeholder="Ex: 80"
                              className="transition-all duration-200 focus:scale-[1.01]"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Wind className="w-4 h-4 text-purple-500" />
                          Gás MQ2
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Mínimo</label>
                            <Input
                              type="number"
                              value={filters.gasMin}
                              onChange={(e) => setFilters({ ...filters, gasMin: e.target.value })}
                              placeholder="Ex: 0"
                              className="transition-all duration-200 focus:scale-[1.01]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Máximo</label>
                            <Input
                              type="number"
                              value={filters.gasMax}
                              onChange={(e) => setFilters({ ...filters, gasMax: e.target.value })}
                              placeholder="Ex: 1000"
                              className="transition-all duration-200 focus:scale-[1.01]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select
                          value={filters.status}
                          onValueChange={(value) => setFilters({ ...filters, status: value })}
                        >
                          <SelectTrigger className="transition-all duration-200 hover:scale-[1.01]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="alerta">Alerta</SelectItem>
                            <SelectItem value="critico">Crítico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Alerta</label>
                        <Select
                          value={filters.alerta}
                          onValueChange={(value) => setFilters({ ...filters, alerta: value })}
                        >
                          <SelectTrigger className="transition-all duration-200 hover:scale-[1.01]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="yes">Sim</SelectItem>
                            <SelectItem value="no">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="w-full transition-all duration-200 hover:scale-[1.02] hover:bg-destructive/10 hover:text-destructive hover:border-destructive bg-transparent"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Limpar Todos os Filtros
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm">Data/Hora</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Temperatura</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Umidade</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Gás MQ2</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Alerta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row, index) => {
                        const gasStatus = getGasStatus(row.gas_mq2)
                        return (
                          <tr
                            key={row.id || index}
                            className={`border-b transition-colors duration-200 hover:bg-muted/50 ${
                              row.alerta ? "bg-destructive/5" : ""
                            }`}
                          >
                            <td className="py-3 px-4 text-sm">
                              {row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : "-"}
                            </td>
                            <td
                              className={`py-3 px-4 font-medium ${
                                row.temperatura > 35
                                  ? "text-orange-600 font-bold"
                                  : row.temperatura < 10
                                    ? "text-blue-400 font-bold"
                                    : ""
                              }`}
                            >
                              {row.temperatura}°C
                            </td>
                            <td
                              className={`py-3 px-4 font-medium ${
                                row.umidade > 80
                                  ? "text-blue-600 font-bold"
                                  : row.umidade < 30
                                    ? "text-orange-500 font-bold"
                                    : ""
                              }`}
                            >
                              {row.umidade}%
                            </td>
                            <td
                              className={`py-3 px-4 font-medium ${gasStatus.color} ${gasStatus.isCritical ? "font-bold" : ""}`}
                            >
                              {row.gas_mq2} ppm
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="capitalize">
                                {row.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {getAlertIcon(row)}
                                <span className="text-sm">{getAlertMessage(row)}</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredData.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      {loading
                        ? "Carregando dados..."
                        : hasActiveFilters
                          ? "Nenhum registro encontrado com os filtros aplicados"
                          : "Nenhum dado encontrado"}
                    </div>
                  )}
                  {filteredData.length > 0 && (
                    <div className="flex items-center justify-between py-4 px-4 bg-muted/30">
                      <div className="text-sm text-muted-foreground">
                        Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
                        {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de {filteredData.length} registro
                        {filteredData.length !== 1 ? "s" : ""}
                        {hasActiveFilters && ` (${data.length} total)`}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="transition-all duration-200 hover:scale-105"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Anterior
                          </Button>
                          <div className="text-sm font-medium px-3">
                            {currentPage} / {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="transition-all duration-200 hover:scale-105"
                          >
                            Próxima
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {connected && isFullscreen && latestData && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Temperature Card */}
              <Card
                className={`transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden border-2 ${
                  latestData.temperatura > 35
                    ? "border-red-500 shadow-red-500/20"
                    : latestData.temperatura < 10
                      ? "border-blue-400 shadow-blue-400/20"
                      : "border-border shadow-lg"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-semibold">Temperatura</CardTitle>
                  <Thermometer
                    className={`w-5 h-5 ${
                      latestData.temperatura > 35
                        ? "text-red-600 animate-pulse"
                        : latestData.temperatura < 10
                          ? "text-blue-400 animate-pulse"
                          : "text-orange-500"
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-4xl font-bold mb-2">{latestData.temperatura}°C</div>
                      {latestData.temperatura > 35 && (
                        <Badge variant="destructive" className="text-xs">
                          <Flame className="w-3 h-3 mr-1" /> Crítico
                        </Badge>
                      )}
                      {latestData.temperatura < 10 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        >
                          <Waves className="w-3 h-3 mr-1" /> Muito frio
                        </Badge>
                      )}
                      {latestData.temperatura >= 10 && latestData.temperatura <= 35 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        >
                          Normal
                        </Badge>
                      )}
                    </div>
                    <div className="relative w-12 h-32 bg-muted rounded-full overflow-hidden border-2 border-border">
                      <div
                        className="absolute bottom-0 w-full transition-all duration-1000 ease-out animate-mercury-rise"
                        style={{
                          height: `${Math.min((latestData.temperatura / 50) * 100, 100)}%`,
                          background:
                            latestData.temperatura > 35
                              ? "linear-gradient(to top, #dc2626, #f97316, #fbbf24)"
                              : latestData.temperatura < 10
                                ? "linear-gradient(to top, #3b82f6, #60a5fa, #93c5fd)"
                                : "linear-gradient(to top, #22c55e, #4ade80, #86efac)",
                        }}
                      />
                      <div
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${
                          latestData.temperatura > 35
                            ? "bg-red-600"
                            : latestData.temperatura < 10
                              ? "bg-blue-400"
                              : "bg-green-500"
                        }`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Humidity Card - Fullscreen version */}
              <Card
                className={`transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden border-2 ${
                  latestData.umidade > 80
                    ? "border-blue-500 shadow-blue-500/20"
                    : latestData.umidade < 30
                      ? "border-orange-400 shadow-orange-400/20"
                      : "border-border shadow-lg"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-semibold">Umidade</CardTitle>
                  <Droplets
                    className={`w-5 h-5 ${
                      latestData.umidade > 80
                        ? "text-blue-600 animate-pulse"
                        : latestData.umidade < 30
                          ? "text-orange-500 animate-pulse"
                          : "text-blue-500"
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-4xl font-bold mb-2">{latestData.umidade}%</div>
                      {latestData.umidade > 80 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        >
                          <CloudRain className="w-3 h-3 mr-1" /> Muito alta
                        </Badge>
                      )}
                      {latestData.umidade < 30 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                        >
                          Ar seco
                        </Badge>
                      )}
                      {latestData.umidade >= 30 && latestData.umidade <= 80 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        >
                          Ideal
                        </Badge>
                      )}
                    </div>
                    <div className="relative w-12 h-32 bg-muted rounded-lg overflow-hidden border-2 border-border">
                      {/* Animated droplets falling */}
                      <div
                        className="absolute top-2 left-1/4 w-1.5 h-1.5 rounded-full bg-blue-400 animate-droplet-fall"
                        style={{ animationDelay: "0s" }}
                      />
                      <div
                        className="absolute top-2 left-2/4 w-1.5 h-1.5 rounded-full bg-blue-400 animate-droplet-fall"
                        style={{ animationDelay: "0.7s" }}
                      />
                      <div
                        className="absolute top-2 left-3/4 w-1.5 h-1.5 rounded-full bg-blue-400 animate-droplet-fall"
                        style={{ animationDelay: "1.4s" }}
                      />

                      {/* Water fill with gentle wave animation */}
                      <div
                        className="absolute bottom-0 w-full transition-all duration-1000 ease-out animate-gentle-wave"
                        style={{
                          height: `${latestData.umidade}%`,
                          background:
                            latestData.umidade > 80
                              ? "linear-gradient(to top, #0ea5e9, #38bdf8, #7dd3fc)"
                              : latestData.umidade < 30
                                ? "linear-gradient(to top, #f59e0b, #fbbf24, #fcd34d)"
                                : "linear-gradient(to top, #06b6d4, #22d3ee, #67e8f9)",
                        }}
                      >
                        {/* Ripple effect on water surface */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-blue-300/50 animate-water-ripple" />
                        <div
                          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-blue-300/50 animate-water-ripple"
                          style={{ animationDelay: "0.5s" }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gas Card */}
              <Card
                className={`transition-all duration-500 hover:scale-105 hover:shadow-2xl overflow-hidden border-2 ${
                  latestData.gas_mq2 >= 1200.0
                    ? "border-red-500 shadow-red-500/20"
                    : latestData.gas_mq2 >= 800.0
                      ? "border-orange-500 shadow-orange-500/20"
                      : latestData.gas_mq2 >= 400.0
                        ? "border-yellow-500 shadow-yellow-500/20"
                        : "border-border shadow-lg"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-semibold">Gases Inflamáveis ou Fumaça</CardTitle>
                  <Skull
                    className={`w-5 h-5 ${
                      latestData.gas_mq2 >= 1200.0
                        ? "text-red-600 animate-pulse"
                        : latestData.gas_mq2 >= 800.0
                          ? "text-orange-600 animate-pulse"
                          : latestData.gas_mq2 >= 400.0
                            ? "text-yellow-600 animate-pulse"
                            : "text-gray-500"
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-4xl font-bold mb-2">
                        {latestData.gas_mq2} <span className="text-lg text-muted-foreground">ppm</span>
                      </div>
                      {latestData.gas_mq2 >= 1200.0 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" /> CRÍTICO
                        </Badge>
                      )}
                      {latestData.gas_mq2 >= 800.0 && latestData.gas_mq2 < 1200.0 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" /> PERIGO
                        </Badge>
                      )}
                      {latestData.gas_mq2 >= 400.0 && latestData.gas_mq2 < 800.0 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                        >
                          <Skull className="w-3 h-3 mr-1" /> Atenção
                        </Badge>
                      )}
                      {latestData.gas_mq2 < 400.0 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        >
                          Normal
                        </Badge>
                      )}
                    </div>
                    <div className="relative w-16 h-32 flex items-center justify-center">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-border shadow-lg ${
                          latestData.gas_mq2 >= 400.0 ? "animate-toxic-breath" : ""
                        } ${
                          latestData.gas_mq2 >= 1200.0
                            ? "bg-red-500"
                            : latestData.gas_mq2 >= 800.0
                              ? "bg-orange-500"
                              : latestData.gas_mq2 >= 400.0
                                ? "bg-yellow-500"
                                : "bg-green-500"
                        }`}
                      >
                        <Skull className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <footer className="border-t-2 pt-6 sm:pt-8 mt-8 sm:mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="font-semibold text-base">Desenvolvido por Murilo Beraldo</span>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/mhbs12"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-foreground transition-all duration-300 hover:scale-110"
              >
                <Github className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">GitHub</span>
              </a>
              <a
                href="https://linkedin.com/in/muriloberaldo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-foreground transition-all duration-300 hover:scale-110"
              >
                <Linkedin className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">LinkedIn</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
