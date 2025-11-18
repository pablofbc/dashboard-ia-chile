"use client";
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;
import '../i18n';
import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { ENDPOINTS } from "@/lib/environment"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Label } from "recharts"
import { MapPin, BarChart3, Users, AlertTriangle, Info, Brain } from "lucide-react"
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { toast } from "sonner"
import { WordCloud } from './components/word-cloud';
interface Provincia {
  codigo: string
  nombre: string
}

interface PalabraFrecuencia {
  palabra: string;
  frecuencia: number;
}

interface TranscripcionDetalle {
  idtrans: number
  path: string
  transcripcion: string
  fechaRegistro: string
  analisis: string
}

interface ProblematicaResult {
  codprovincia: string
  provincia: string
  coddepartamento: string
  departamento: string
  codvisita: string
  agrupador: string
  categoria?: string
  idtrans: number
  textoAgrupador: string
  textoAgrupadorEn: string
}

interface DatosGraficos {
  agrupadores: Array<{ name: string; value: number; originalName: string }>
  departamentos: Array<{ name: string; value: number }>
  transcripciones: Array<{ name: string; value: number }>
}

// Datos de provincias
const provincias: Provincia[] = [
  { codigo: "COD_DDA", nombre: "Diego de Almagro" },
  { codigo: "COD_INCA", nombre: "Inca de Oro" },
  { codigo: "COD_COMU", nombre: "Comunidades" },
]

interface Departamento {
  codigo: string
  nombre: string
}

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    setOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    //extraerr y guardar en una variable el lenguaje del localestorage 
    const idioma = localStorage.getItem("language"); 
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <div className="flex gap-2 justify-end mb-2 items-center relative" ref={menuRef}>
      <button
        className="mr-2 flex items-center focus:outline-none"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Seleccionar idioma"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe w-5 h-5 text-primary"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
      </button>
      {open && (
        <div className="absolute top-8 right-0 bg-background border rounded shadow-md z-50 flex flex-col min-w-[80px]">
          <button
            className={`cursor-pointer px-2 py-1 text-xs font-semibold border-b border-border hover:bg-primary/10 flex items-center gap-2 ${i18n.language === 'es' ? 'bg-primary text-white' : 'bg-background text-foreground'}`}
            onClick={() => handleSelect('es')}
          >
            <img src="/es.png" alt="Español" className="w-5 h-5 rounded-full" />
            ES
          </button>
          <button
            className={`cursor-pointer px-2 py-1 text-xs font-semibold hover:bg-primary/10 flex items-center gap-2 ${i18n.language === 'en' ? 'bg-primary text-white' : 'bg-background text-foreground'}`}
            onClick={() => handleSelect('en')}
          >
            <img src="/en.png" alt="English" className="w-5 h-5 rounded-full" />
            EN
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardProvincias() {
  const { t, i18n } = useTranslation();
  // Estado para paginación mobile de departamentos
  const [depPage, setDepPage] = useState(1);
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState<string>("")
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("problematicas");
  const [problematicas, setProblematicas] = useState<ProblematicaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [detalleTranscripcion, setDetalleTranscripcion] = useState<TranscripcionDetalle | null>(null)
  const [isDetalleOpen, setIsDetalleOpen] = useState(false)
  const [currentTransPage, setCurrentTransPage] = useState(1)
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [availableDepartments, setAvailableDepartments] = useState<Departamento[]>([])
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const ITEMS_PER_PAGE = 10
  const TRANS_PER_PAGE = 10
  const ITEMS_PER_PAGE_DEP = 5;
  const [transcripcionesIA, setTranscripcionesIA] = useState<TranscripcionDetalle[]>([])
  const [sentimientos, setSentimientos] = useState<{ tipo: string; cantidad: number; porcentaje: string }[]>([])
  const [nubePalabrasGeneral, setNubePalabrasGeneral] = useState<{ palabra: string; frecuencia: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryData, setCategoryData] = useState<any>(null)
  const [datosGraficosState, setDatosGraficosState] = useState<DatosGraficos | null>(null)

  useEffect(() => {
    if (provinciaSeleccionada) {
      obtenerProblematicas(provinciaSeleccionada, tipoSeleccionado);
    }
  }, [tipoSeleccionado]);

  // Recargar problemáticas cuando cambia el idioma
  useEffect(() => {
    if (provinciaSeleccionada) {
      obtenerProblematicas(provinciaSeleccionada, tipoSeleccionado);
    }
  }, [i18n.language]);

  // Recalcular gráficos cuando cambia el idioma
  useEffect(() => {
    if (problematicas.length > 0) {
      const datosActualizados = procesarDatosGraficos();
      setDatosGraficosState(datosActualizados);
    }
  }, [i18n.language, selectedDepartment, problematicas]);

  // Función para obtener problemáticas por provincia
  const obtenerProblematicas = async (codProvincia: string, tipo: string) => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(ENDPOINTS.problematicasByCodProvincia(codProvincia, tipo, i18n.language))
      if (!response.ok) {
        throw new Error("Error al obtener los datos")
      }
      const data: ProblematicaResult[] = await response.json()
      setProblematicas(data)
      //console.log(data, 'problematicas:');
      // 🔹 Construir lista única de departamentos con código y nombre
      const uniqueDepartments = Array.from(
        new Map(
          data.map((item) => [item.coddepartamento, { codigo: item.coddepartamento, nombre: item.departamento }])
        ).values()
      )
      setAvailableDepartments(uniqueDepartments)
      setSelectedDepartment("all")
      obtenerTranscripcionesIA(codProvincia, '',tipoSeleccionado)
    } catch (err) {
      setError("Error al cargar las problemáticas. Verifique su conexión.")
      setProblematicas([])
      setAvailableDepartments([])
      setSentimientos([])
      setNubePalabrasGeneral([])
    } finally {
      setLoading(false)
    }
  }

  const procesarSentimientos = (transcripciones: TranscripcionDetalle[]) => {
    const conteo: Record<string, number> = {}

    transcripciones.forEach((t) => {
      try {
        const analisis = JSON.parse(t.analisis)
        const tipo = analisis.sentimiento?.tipo || "desconocido"
        conteo[tipo] = (conteo[tipo] || 0) + 1
      } catch (e) {
        console.error("Error parseando análisis:", e)
      }
    })
    console.log(conteo, 'conteo');

    const total = transcripciones.length
    return Object.entries(conteo).map(([tipo, cantidad]) => ({
      tipo,
      cantidad,
      porcentaje: total > 0 ? ((cantidad / total) * 100).toFixed(1) : "0.0",
    }))
  }

//   const procesarNubePalabras = (transcripciones: TranscripcionDetalle[]) => {
//   const conteo: Record<string, { palabraOriginal: string; frecuencia: number }> = {};

//   transcripciones.forEach((t) => {
//     try {
//       const analisis = JSON.parse(t.analisis);
//       const nube = analisis.nube_palabras || [];
      
//       nube.forEach((item: { palabra: string; frecuencia: number }) => {
//         const palabraNormalizada = normalizarTexto(item.palabra);
        
//         if (conteo[palabraNormalizada]) {
//           // Si ya existe, solo sumamos la frecuencia
//           conteo[palabraNormalizada].frecuencia += item.frecuencia;
//         } else {
//           // Si no existe, guardamos la palabra original (la primera que aparece)
//           conteo[palabraNormalizada] = {
//             palabraOriginal: item.palabra,
//             frecuencia: item.frecuencia
//           };
//         }
//       });
//     } catch (e) {
//       console.error("Error parseando análisis para nube de palabras:", e);
//     }
//   });

//   const sortedPalabras = Object.values(conteo)
//     .map(({ palabraOriginal, frecuencia }) => ({ 
//       palabra: palabraOriginal, 
//       frecuencia 
//     }))
//     .sort((a, b) => b.frecuencia - a.frecuencia)
//     .slice(0, 30); // Top 30 words

//   return sortedPalabras;
// };

  const procesarNubePalabras = (
  transcripciones: TranscripcionDetalle[], 
  limite: number = 30,
  frecuenciaMinima: number = 4
): PalabraFrecuencia[] => {
  // Map para mejor performance en lookups
  const conteo = new Map<string, { palabraOriginal: string; frecuencia: number }>();

  for (const t of transcripciones) {
    // Validación temprana
    if (!t.analisis) continue;
    
    try {
      const analisis = JSON.parse(t.analisis);
      const nube = analisis.nube_palabras;
      
      // Validación de estructura
      if (!Array.isArray(nube) || nube.length === 0) continue;
      
      for (const item of nube) {
        // Validación de datos
        if (!item.palabra || typeof item.frecuencia !== 'number') continue;
        
        const palabraNormalizada = normalizarTexto(item.palabra);
        const entrada = conteo.get(palabraNormalizada);
        
        if (entrada) {
          entrada.frecuencia += item.frecuencia;
        } else {
          conteo.set(palabraNormalizada, {
            palabraOriginal: item.palabra,
            frecuencia: item.frecuencia
          });
        }
      }
    } catch (e) {
      console.error(`Error parseando análisis (ID: ${t.idtrans || 'desconocido'}):`, e);
    }
  }

  // Convertir Map a array, filtrar por frecuencia mínima y ordenar
  return Array.from(conteo.values(), ({ palabraOriginal, frecuencia }) => ({
    palabra: palabraOriginal,
    frecuencia
  }))
    .filter(item => item.frecuencia >= frecuenciaMinima)
    .sort((a, b) => b.frecuencia - a.frecuencia)
    .slice(0, limite);
};

  const normalizarTexto = (texto: string): string => {
  return texto
    .toLowerCase()
    .normalize("NFD") // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, ""); // Remueve los diacríticos (acentos)
};


  const obtenerTranscripcionesIA = async (codProvincia: string, departamento: string, tipo: string) => {
    setLoading(true)
    try {
      const idioma = localStorage.getItem('language') || 'es';
      const response = await fetch(ENDPOINTS.transcriptionsByProvByDep(codProvincia, departamento, idioma, tipo))
      console.log(response, 'response transcripcionesIA:');
      if (!response.ok) throw new Error("Error al obtener transcripciones IA")
      const data = await response.json()
      setTranscripcionesIA(data)
      setSentimientos(procesarSentimientos(data))
      setNubePalabrasGeneral(procesarNubePalabras(data))
    } catch (err) {
      setError("Error al cargar las transcripciones IA.")
      setTranscripcionesIA([])
      setSentimientos([])
      setNubePalabrasGeneral([])
    } finally {
      setLoading(false)
    }
  }

  const procesarDatosGraficos = () => {
    const problematicasFiltradas = selectedDepartment === "all"
      ? problematicas
      : problematicas.filter(p => p.departamento === selectedDepartment)

    const agrupadores = problematicasFiltradas.reduce((acc, item) => {
      const originalAgrupador = item.agrupador || "Sin categoría"
      // Usar textoAgrupadorEn si el idioma es inglés, sino textoAgrupador
      const agrupadorDisplay = i18n.language === 'en' ? item.textoAgrupadorEn : item.textoAgrupador

      if (!acc[agrupadorDisplay]) {
        acc[agrupadorDisplay] = { value: 0, originalName: originalAgrupador }
      }
      acc[agrupadorDisplay].value += 1
      return acc
    }, {} as Record<string, { value: number; originalName: string }>)


    const departamentos = problematicas.reduce(
      (acc, item) => {
        acc[item.departamento] = (acc[item.departamento] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const transcripciones = problematicasFiltradas.reduce(
      (acc, item) => {
        acc[item.idtrans] = (acc[item.idtrans] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      agrupadores: Object.entries(agrupadores)
        .map(([name, data]) => ({ name, value: data.value, originalName: data.originalName }))
        .sort((a, b) => b.value - a.value),
      departamentos: Object.entries(departamentos).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      transcripciones: Object.entries(transcripciones).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    }
  }

  const datosGraficos = datosGraficosState || procesarDatosGraficos()
  const transPageCount = Math.ceil(transcripcionesIA.length / TRANS_PER_PAGE)

  const getTransPaginationGroup = () => {
    const SIBLING_COUNT = 1;
    const DOTS = "...";

    if (transPageCount <= 7) {
      return Array.from({ length: transPageCount }, (_, i) => i + 1);
    }

    // Calcular los rangos
    const leftSiblingIndex = Math.max(currentTransPage - SIBLING_COUNT, 1);
    const rightSiblingIndex = Math.min(currentTransPage + SIBLING_COUNT, transPageCount);
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < transPageCount - 1;

    // Caso 1: mostrar puntos suspensivos a la derecha
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * SIBLING_COUNT;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, DOTS, transPageCount];
    }

    // Caso 2: mostrar puntos suspensivos a la izquierda
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * SIBLING_COUNT;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => transPageCount - rightItemCount + i + 1
      );
      return [1, DOTS, ...rightRange];
    }

    // Caso 3: mostrar puntos suspensivos en ambos lados
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, DOTS, ...middleRange, DOTS, transPageCount];
    }

    return Array.from({ length: transPageCount }, (_, i) => i + 1);
  }

  const getDepPaginationGroup = () => {
    const SIBLING_COUNT = 1;
    const DOTS = "...";
    const depPageCount = Math.ceil(datosGraficos.departamentos.length / ITEMS_PER_PAGE_DEP);

    if (depPageCount <= 7) {
      return Array.from({ length: depPageCount }, (_, i) => i + 1);
    }

    // Calcular los rangos
    const leftSiblingIndex = Math.max(depPage - SIBLING_COUNT, 1);
    const rightSiblingIndex = Math.min(depPage + SIBLING_COUNT, depPageCount);
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < depPageCount - 1;

    // Caso 1: mostrar puntos suspensivos a la derecha
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * SIBLING_COUNT;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, DOTS, depPageCount];
    }

    // Caso 2: mostrar puntos suspensivos a la izquierda
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * SIBLING_COUNT;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => depPageCount - rightItemCount + i + 1
      );
      return [1, DOTS, ...rightRange];
    }

    // Caso 3: mostrar puntos suspensivos en ambos lados
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, DOTS, ...middleRange, DOTS, depPageCount];
    }

    return Array.from({ length: depPageCount }, (_, i) => i + 1);
  }

  const obtenerDetalleTranscripcion = async (idTranscripcion: number) => {
    setLoading(true)
    try {
      const idioma = localStorage.getItem('language') || 'es';
      const response = await fetch(ENDPOINTS.transcriptionById(idTranscripcion, idioma))
      console.log(response, 'response detalle transcripcion:');
      if (!response.ok) {
        throw new Error("Error al obtener el detalle")
      }
      const detalle = await response.json()
      setDetalleTranscripcion(detalle[0])
      setIsDetalleOpen(true)
    } catch (error) {
      setError("Error al cargar el detalle de la transcripción")
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryClick = async (categoryAgrupador: string, data: any) => {
    const displayName = categoryAgrupador.replace(/^CAT_/, "").replace(/_/g, " ");
    setSelectedCategory(data.payload.name || displayName);
    const codProvincia = provinciaSeleccionada;
    let codDepartamento = '';
    if (selectedDepartment !== 'all') {
      const departamento = availableDepartments.find(d => d.nombre === selectedDepartment);
      if (departamento) {
        codDepartamento = departamento.codigo;
      }
    } else {
      codDepartamento = 'all'
    }
    setLoading(true);
    try {
      const idioma = localStorage.getItem('language') || 'es';
      const response = await fetch(ENDPOINTS.problematicasByProvByDepByGrouper(codProvincia, codDepartamento, categoryAgrupador, idioma, tipoSeleccionado));
      console.log(response, 'response category detail:');
      if (!response.ok) {
        throw new Error('Error al obtener los datos');
      }
      const data = await response.json();
      setCategoryData({ analisisDetallado: data });
      setIsCategoryModalOpen(true);
    } catch (err) {
      setError("Error al cargar el detalle de la categoría.");
      setCategoryData(null);
    } finally {
      setLoading(false);
    }
  }

  // Colores para gráficos
  const coloresGrafico = [
    "#FFE0B2", // Naranja Claro (Principal)
    "#2196F3", // Azul brillante
    "#4CAF50", // Verde medio
    "#3F51B5", // Índigo
    "#009688", // Verde azulado
  ];

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-8 lg:p-12">
      <div className="mx-auto space-y-8 sm:space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 sm:space-y-6 mb-8 sm:mb-12">
          <LanguageSwitcher />
          <div className="inline-block p-2 bg-primary/10 rounded-xl mb-3 sm:mb-4">
            <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)] text-balance">
            {t('Dashboard_de_Problematicas')}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-[family-name:var(--font-dm-sans)] max-w-2xl mx-auto text-pretty leading-relaxed px-2">
            {t('Analiza_y_visualiza_las_problematicas')}
          </p>
        </div>

        {/* Selectores en una sola fila */}
        <div className="bg-gradient-to-r from-primary/5 to-transparent p-8 rounded-xl border border-border/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
                {t("Filtrar_por_Ubicación")}
              </h2>
              <p className="text-muted-foreground font-[family-name:var(--font-dm-sans)] mt-1">
                {t('Selecciona una provincia y departamento para visualizar las problemáticas')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Selector de Tipo */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">{t('Tipo')}</div>
              <Select value={tipoSeleccionado} onValueChange={setTipoSeleccionado}>
                <SelectTrigger className="w-full" style={{borderColor: 'hsl(var(--border))'}}>
                  <SelectValue placeholder={t('Seleccione_un_tipo' )} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="problematicas">{t('Seleccione_problematicas' )}</SelectItem>
                  <SelectItem value="aspectos">{t('Seleccione_aspectos' )}</SelectItem>
                  <SelectItem value="imagen">{t('Seleccione_imagenes' )}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Provincias */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">{t('Provincia')}</div>
              <Select
                value={provinciaSeleccionada}
                onValueChange={(value) => {
                  setProvinciaSeleccionada(value);
                  obtenerProblematicas(value, tipoSeleccionado);
                  setCurrentPage(1);
                  setCurrentTransPage(1);
                }}
              >
                <SelectTrigger className="w-full" style={{borderColor: 'hsl(var(--border))'}}>
                  <SelectValue placeholder={t('Selecciona_una_provincia')} />
                </SelectTrigger>
                <SelectContent>
                  {provincias.map((provincia) => (
                    <SelectItem key={provincia.codigo} value={provincia.codigo}>
                      {provincia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Departamentos */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">{t('Department')}</div>
              <Select
                value={selectedDepartment}
                onValueChange={(value) => {
                  setSelectedDepartment(value);
                  if (value !== 'all') {
                    const depto = availableDepartments.find(d => d.nombre === value);
                    if (depto) {
                      obtenerTranscripcionesIA(provinciaSeleccionada, depto.codigo, tipoSeleccionado);
                    }
                  } else {
                    obtenerTranscripcionesIA(provinciaSeleccionada, '', tipoSeleccionado);
                  }
                }}
                disabled={!provinciaSeleccionada || availableDepartments.length === 0}
              >
                <SelectTrigger className="w-full" style={{borderColor: 'hsl(var(--border))'}}>
                  <SelectValue placeholder={t('Seleccione_un_departamento')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('Todos')}</SelectItem>
                  {availableDepartments.map((departamento) => (
                    <SelectItem key={departamento.codigo} value={departamento.nombre}>
                      {departamento.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Estado de carga y error */}
      {loading && (
        <Card className="border-border cursor-pointer mb-2">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground font-[family-name:var(--font-dm-sans)]">{t('Cargando datos...')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 cursor-pointer mb-2">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-destructive font-[family-name:var(--font-dm-sans)]">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {provinciaSeleccionada && problematicas.length > 0 && !loading && (
        <>
          {/* Métricas Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-2">
            <Card className="border-border hover:border-primary/50 transition-colors duration-300">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="space-y-3 sm:space-y-4">
                  <div className="p-2 sm:p-3 bg-primary/10 rounded-lg inline-block">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground font-[family-name:var(--font-dm-sans)] mb-2">
                      {t('Ubicacion')}
                    </p>
                    <p className="text-2xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)] text-balance">
                      {provincias.find((p) => p.codigo === provinciaSeleccionada)?.nombre}
                      {selectedDepartment !== "all" && (
                        <span className="block text-sm text-muted-foreground mt-2">
                          {t('Dpto.')} {selectedDepartment}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-colors duration-300 mb-2">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="p-3 bg-primary/10 rounded-lg inline-block">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground font-[family-name:var(--font-dm-sans)] mb-2">
                      {t('Categorias_Identificadas')}
                    </p>
                    <p className="text-3xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)]">
                      {datosGraficos.agrupadores.length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('tipos_de_problematicas_distintas')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-colors duration-300 mb-2">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="p-3 bg-primary/10 rounded-lg inline-block">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground font-[family-name:var(--font-dm-sans)] mb-2">
                      {t('Transcripciones_Analizadas_con_IA')}
                    </p>
                    <p className="text-3xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)]">
                      {datosGraficos.transcripciones.length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedDepartment === "all" ? t("en_la_provincia") : t("en el departamento")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Barras - Agrupadores */}
              <Card className="border-border md:col-span-2 mb-2">
                <CardHeader>
                  <CardTitle className="font-[family-name:var(--font-space-grotesk)]">
                    {t('Distribucion_de_Problematicas_por_Categoria')}
                  </CardTitle>
                  <CardDescription className="font-[family-name:var(--font-dm-sans)]">
                    {selectedDepartment === "all"
                      ? `${t('Categorias_identificadas_en')} ${provincias.find((p) => p.codigo === provinciaSeleccionada)?.nombre}`
                      : `${t('Categorias_identificadas_en_el_departamento_de')} ${selectedDepartment}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Responsive: scroll horizontal y tamaño reducido en mobile, igual en desktop */}
                  <div className="w-full">
                    <div className="block sm:hidden -mx-2">
                      <div className="overflow-x-auto px-2">
                        <div style={{ minWidth: 420, width: '100vw', maxWidth: 600 }}>
                          <ResponsiveContainer width="100%" height={320}>
                            <BarChart
                              data={datosGraficos.agrupadores}
                              margin={{ bottom: 60, left: 20 }}
                              barSize={28}
                            >
                              <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" opacity={0.5} />
                              <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={10}
                                className="font-[family-name:var(--font-dm-sans)] text-xs"
                                interval={0}
                                angle={-35}
                                textAnchor="end"
                                height={80}
                                tick={({ x, y, payload }) => {
                                  const key = payload.value
                                    .replace(/ /g, '_')
                                    .replace(/[áÁ]/g, 'a')
                                    .replace(/[éÉ]/g, 'e')
                                    .replace(/[íÍ]/g, 'i')
                                    .replace(/[óÓ]/g, 'o')
                                    .replace(/[úÚ]/g, 'u')
                                    .replace(/[ñÑ]/g, 'n')
                                    .replace(/[^a-zA-Z0-9_]/g, '');
                                  return (
                                    <text
                                      x={x}
                                      y={y}
                                      dy={10}
                                      textAnchor="end"
                                      transform={`rotate(-35, ${x}, ${y})`}
                                      className="text-xs font-[family-name:var(--font-dm-sans)] fill-current text-muted-foreground"
                                    >
                                      {t(key) || (payload.value.length > 18 ? payload.value.slice(0, 15) + "…" : payload.value)}
                                    </text>
                                  );
                                }}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={10}
                                className="font-[family-name:var(--font-dm-sans)]"
                                tickFormatter={(value) => `${value}`}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  padding: "8px"
                                }}
                                labelStyle={{
                                  color: "hsl(var(--foreground))",
                                  fontWeight: "bold",
                                  marginBottom: "4px"
                                }}
                                formatter={(value: number) => {
                                  const total = datosGraficos.agrupadores.reduce((acc: number, curr: any) => acc + curr.value, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                                  return [`${percentage}%`];
                                }}
                              />
                              <Bar
                                dataKey="value"
                                radius={[4, 4, 0, 0]}
                                animationDuration={1000}
                                onClick={(data: any) => handleCategoryClick(data.originalName, data)}
                              >
                                {datosGraficos.agrupadores.map((entry: any, index: number) => (
                                  <Cell
                                    key={`cell-mob-${index}`}
                                    fill={coloresGrafico[index % coloresGrafico.length]}
                                    opacity={0.8}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <ResponsiveContainer width="100%" height={600}>
                        <BarChart
                          data={datosGraficos.agrupadores}
                          margin={{ bottom: 100, left: 40 }}
                          barSize={40}
                        >
                          <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            className="font-[family-name:var(--font-dm-sans)] text-sm"
                            interval={0}
                            angle={-55}
                            textAnchor="end"
                            height={120}
                            tick={({ x, y, payload }) => {
                              // Traducción de categorías
                              const key = payload.value
                                .replace(/ /g, '_')
                                .replace(/[áÁ]/g, 'a')
                                .replace(/[éÉ]/g, 'e')
                                .replace(/[íÍ]/g, 'i')
                                .replace(/[óÓ]/g, 'o')
                                .replace(/[úÚ]/g, 'u')
                                .replace(/[ñÑ]/g, 'n')
                                .replace(/[^a-zA-Z0-9_]/g, '')
                                .replace(/^CAT_/, "").replace(/_/g, " ")
                              ;
                              return (
                                <text
                                  x={x}
                                  y={y}
                                  dy={10}
                                  textAnchor="end"
                                  transform={`rotate(-35, ${x}, ${y})`}
                                  className="text-xs font-[family-name:var(--font-dm-sans)] fill-current text-muted-foreground"
                                >
                                  {t(key) || payload.value}
                                </text>
                              );
                            }}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            className="font-[family-name:var(--font-dm-sans)]"
                            tickFormatter={(value) => `${value}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              padding: "8px"
                            }}
                            labelStyle={{
                              color: "hsl(var(--foreground))",
                              fontWeight: "bold",
                              marginBottom: "4px"
                            }}
                            formatter={(value: number) => {
                              const total = datosGraficos.agrupadores.reduce((acc: number, curr: any) => acc + curr.value, 0);
                              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                              return [`${percentage}%`];
                            }}
                          />
                          <Bar
                            dataKey="value"
                            radius={[4, 4, 0, 0]}
                            animationDuration={1000}
                            onClick={(data: any) => handleCategoryClick(data.originalName, data)}
                          >
                            {datosGraficos.agrupadores.map((entry: any, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={coloresGrafico[index % coloresGrafico.length]}
                                opacity={0.8}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

          {/* Sección: Información por Departamento */}
          <div className="bg-gradient-to-r from-primary/5 to-transparent p-8 rounded-xl mt-12 border border-border/50">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
                  {t('Informacion_por_Departamento')}
                </h2>
                <p className="text-muted-foreground font-[family-name:var(--font-dm-sans)] mt-1">
                  {t('Analisis_detallado_por_departamento')}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de Problemáticas por Departamento */}
          <Card className="border-border mb-2">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-space-grotesk)]">
                {t('Problematicas_por_Departamento')}
              </CardTitle>
              <CardDescription className="font-[family-name:var(--font-dm-sans)]">
                {t('Distribucion_de_problematicas_agrupadas_por_departamento')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const depPageCount = Math.ceil(datosGraficos.departamentos.length / ITEMS_PER_PAGE_DEP);
                const depsToShow = datosGraficos.departamentos.slice((depPage - 1) * ITEMS_PER_PAGE_DEP, depPage * ITEMS_PER_PAGE_DEP);

                return (
                  <>
                    {/* Tabla en desktop */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-3 font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">{t('Department')}</th>
                            <th className="text-left p-3 font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">{t('Quantity')}</th>
                            <th className="text-left p-3 font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">{t('Percentage')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {depsToShow.map((item: any, index: number) => {
                            const porcentaje = ((item.value / problematicas.length) * 100).toFixed(1);
                            return (
                              <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                                <td className="p-3 font-[family-name:var(--font-dm-sans)]">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: coloresGrafico[index % coloresGrafico.length] }}></div>
                                    {item.name}
                                  </div>
                                </td>
                                <td className="p-3 font-[family-name:var(--font-dm-sans)]">
                                  <Badge variant="outline" className="font-mono text-xs">{item.value}</Badge>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-full bg-muted rounded-full h-2 max-w-[200px]">
                                      <div className="h-2 rounded-full transition-all" style={{ width: `${porcentaje}%`, backgroundColor: coloresGrafico[index % coloresGrafico.length] }}></div>
                                    </div>
                                    <span className="text-sm text-muted-foreground font-[family-name:var(--font-dm-sans)]">{porcentaje}%</span>
                                    <Button className="cursor-pointer" variant="outline" size="sm" onClick={() => { setSelectedDepartment(item.name); setIsDetailModalOpen(true); }}>
                                      {t('Ver_Detalle')}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Cards en mobile */}
                    <div className="block sm:hidden space-y-3">
                      {depsToShow.map((item: any, index: number) => {
                        const porcentaje = ((item.value / problematicas.length) * 100).toFixed(1);
                        const depKey = 'Department ' + item.name;
                        return (
                          <div key={index} className="rounded-xl border border-border bg-card shadow-sm p-3 flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: coloresGrafico[index % coloresGrafico.length] }}></div>
                              <span className="text-xs text-muted-foreground font-[family-name:var(--font-dm-sans)]">{t(depKey) || item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs px-2 py-1">{item.value}</Badge>
                              <span className="text-xs text-muted-foreground">{t('Percentage')}: {porcentaje}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className="h-2 rounded-full transition-all" style={{ width: `${porcentaje}%`, backgroundColor: coloresGrafico[index % coloresGrafico.length] }}></div>
                            </div>
                            <div className="flex justify-end">
                              <Button className="cursor-pointer" variant="outline" size="sm" onClick={() => { setSelectedDepartment(item.name); setIsDetailModalOpen(true); }}>
                                {t('Ver_Detalle')}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Paginación unificada */}
                    {depPageCount > 1 && (
                      <div className="pt-6 sm:pt-4 flex justify-center items-center">
                        <div className="w-full sm:w-auto">
                          <Pagination>
                            <PaginationContent className="flex-wrap justify-center gap-1 sm:gap-0">
                              <PaginationItem>
                                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setDepPage((prev) => Math.max(prev - 1, 1)); }} className={`${depPage === 1 ? "pointer-events-none opacity-50" : ""} text-xs sm:text-sm h-8 sm:h-9`} />
                              </PaginationItem>
                              {getDepPaginationGroup().map((page, index) => (
                                <PaginationItem key={`${page}-${index}`} className="hidden sm:block">
                                  {typeof page === "number" ? (
                                    <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setDepPage(page); }} isActive={depPage === page} className="h-8 sm:h-9 min-w-[32px] sm:min-w-[36px] text-xs sm:text-sm">
                                      {page}
                                    </PaginationLink>
                                  ) : (
                                    <span className="px-2 sm:px-3 flex items-center">...</span>
                                  )}
                                </PaginationItem>
                              ))}
                              <PaginationItem className="flex items-center mx-2">
                                <span className="text-xs sm:text-sm text-muted-foreground">
                                  Página {depPage} de {depPageCount}
                                </span>
                              </PaginationItem>
                              <PaginationItem>
                                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setDepPage((prev) => Math.min(prev + 1, depPageCount)); }} className={`${depPage === depPageCount ? "pointer-events-none opacity-50" : ""} text-xs sm:text-sm h-8 sm:h-9`} />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Sección: Información General */}
          <Card className="border-border mb-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-[family-name:var(--font-space-grotesk)]">
                <BarChart3 className="h-6 w-6 text-primary" />
                {t('Informacion_General')}
              </CardTitle>
              <CardDescription className="font-[family-name:var(--font-dm-sans)]">
                {t('Vision_general_de_las_problematicas_en')} {provincias.find((p) => p.codigo === provinciaSeleccionada)?.nombre}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Gráficos de Información General */}
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Gráfico de Distribución de Problemáticas */}
              <Card className="border-border mb-2">
                <CardHeader>
                  <CardTitle className="font-[family-name:var(--font-space-grotesk)]">
                    {t('Distribucion_por_Tipos_de_Problematica')}
                  </CardTitle>
                  <CardDescription className="font-[family-name:var(--font-dm-sans)]">
                    {t('Proporcion_de_cada_tipo_de_problematica_identificada')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={datosGraficos.agrupadores}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        animationDuration={1000}
                      >
                        {datosGraficos.agrupadores.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={coloresGrafico[index % coloresGrafico.length]}
                            opacity={0.8}
                          />
                        ))}
                        <Label
                          value={datosGraficos.agrupadores.reduce((acc: number, curr: any) => acc + curr.value, 0)}
                          position="center"
                          className="font-[family-name:var(--font-space-grotesk)] fill-current text-foreground text-lg font-bold"
                        />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          padding: "8px"
                        }}
                        formatter={(value: number, name: string) => [
                          `${value} ${t('problematicas')} (${((value / datosGraficos.agrupadores.reduce((acc: number, curr: any) => acc + curr.value, 0)) * 100).toFixed(1)}%)`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Problemáticas */}
              {/* <Card className="border-border mb-2">
                <CardHeader>
                  <CardTitle className="font-[family-name:var(--font-space-grotesk)]">
                    {t('Top_Problematicas')}
                  </CardTitle>
                  <CardDescription className="font-[family-name:var(--font-dm-sans)]">
                    {t('Categorias_mas_frecuentes')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {datosGraficos.agrupadores.slice(0, 5).map((item, index) => {
                      const porcentaje = ((item.value / problematicas.length) * 100).toFixed(1);
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium truncate">{t(item.name) || item.name}</span>
                            <span className="text-muted-foreground">{item.value}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${porcentaje}%`,
                                backgroundColor: coloresGrafico[index % coloresGrafico.length],
                                opacity: 0.8
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card> */}
              <Card className="border-border mb-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-[family-name:var(--font-space-grotesk)]">
                  <Brain className="h-6 w-6 text-primary" />
                  {t('Nube_de_Palabras_General')}
                </CardTitle>
                <CardDescription className="font-[family-name:var(--font-dm-sans)]">
                  {t('Palabras_mas_frecuentes_en_las_transcripciones')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nubePalabrasGeneral.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <WordCloud words={nubePalabrasGeneral} />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{t('No_hay_palabras_frecuentes_para_mostrar')}</p>
                )}
                
              </CardContent>
            </Card>

            </div>
            {/* Tabla de Transcripciones */}
            <Card className="border-border mb-2">
              <CardHeader className="space-y-2 sm:space-y-3">
                <CardTitle className="flex items-center gap-2 text-2xl font-[family-name:var(--font-space-grotesk)]">
                  <Brain className="h-6 w-6 text-primary" />
                  {t('Transcripciones_Analizadas_con_IA')}
                </CardTitle>
                <CardDescription className="font-[family-name:var(--font-dm-sans)]">
                  {selectedDepartment === "all"
                    ? `${t('Transcripciones_registradas')} ${provincias.find((p) => p.codigo === provinciaSeleccionada)?.nombre}`
                    : `${t('Transcripciones registradas en el departamento de')} ${selectedDepartment}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tabla en desktop, cards en mobile */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">
                          {t('Nro. Transcripción')}
                        </th>
                        <th className="text-left p-3 font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">
                          {t('Transcripciones')}
                        </th>
                        <th className="text-left p-3 font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">
                          {t('Acciones')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transcripcionesIA
                        .slice((currentTransPage - 1) * TRANS_PER_PAGE, currentTransPage * TRANS_PER_PAGE)
                        .map((item, index) => (
                          <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="p-3 font-[family-name:var(--font-dm-sans)]">
                              <Badge variant="outline" className="font-mono text-xs">
                                {index + 1 + (currentTransPage - 1) * TRANS_PER_PAGE}
                              </Badge>
                            </td>
                            <td className="p-3 font-[family-name:var(--font-dm-sans)]">
                              {item.transcripcion.slice(0, 100) + "…"}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="cursor-pointer"
                                  onClick={() => obtenerDetalleTranscripcion(item.idtrans)}
                                >
                                  <Info className="h-4 w-4 mr-2" />
                                  {t('Ver_Detalle')}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {/* Cards en mobile */}
                <div className="block sm:hidden space-y-3">
                  {transcripcionesIA
                    .slice((currentTransPage - 1) * TRANS_PER_PAGE, currentTransPage * TRANS_PER_PAGE)
                    .map((item, index) => (
                      <div key={index} className="rounded-xl border border-border bg-card shadow-sm p-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                            {index + 1 + (currentTransPage - 1) * TRANS_PER_PAGE}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Transcripción</span>
                        </div>
                        <div className="text-sm font-[family-name:var(--font-dm-sans)] text-foreground">
                          {item.transcripcion.slice(0, 100) + "…"}
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => obtenerDetalleTranscripcion(item.idtrans)}
                          >
                            <Info className="h-4 w-4 mr-2" />
                            {t('Ver_Detalle')}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="pt-6 sm:pt-4 flex justify-center items-center">
                  <div className="w-full sm:w-auto">
                    <Pagination>
                      <PaginationContent className="flex-wrap justify-center gap-1 sm:gap-0">
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentTransPage((prev) => Math.max(prev - 1, 1))
                            }}
                            className={`${currentTransPage === 1 ? "pointer-events-none opacity-50" : ""} text-xs sm:text-sm h-8 sm:h-9`}
                          />
                        </PaginationItem>
                        {getTransPaginationGroup().map((page, index) => (
                          <PaginationItem key={`${page}-${index}`} className="hidden sm:block">
                            {typeof page === "number" ? (
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault()
                                  setCurrentTransPage(page)
                                }}
                                isActive={currentTransPage === page}
                                className="h-8 sm:h-9 min-w-[32px] sm:min-w-[36px] text-xs sm:text-sm"
                              >
                                {page}
                              </PaginationLink>
                            ) : (
                              <span className="px-2 sm:px-3 flex items-center">...</span>
                            )}
                          </PaginationItem>
                        ))}
                        <PaginationItem className="flex items-center mx-2">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            Página {currentTransPage} de {transPageCount}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentTransPage((prev) => Math.min(prev + 1, transPageCount))
                            }}
                            className={`${currentTransPage === transPageCount ? "pointer-events-none opacity-50" : ""} text-xs sm:text-sm h-8 sm:h-9`}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border mb-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-[family-name:var(--font-space-grotesk)]">
                  <Brain className="h-6 w-6 text-primary" />
                  {t('Analisis_de_Sentimientos')}
                </CardTitle>
                <CardDescription className="font-[family-name:var(--font-dm-sans)]">
                  {t('Resumen_del_sentimiento')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sentimientos.length > 0 ? (
                  <div className="space-y-4">
                    {sentimientos.map((s, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize font-medium">{t(s.tipo)} </span>
                          <span className="text-muted-foreground">{s.cantidad} ({s.porcentaje}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${s.tipo === "negativo"
                              ? "bg-red-500"
                              : s.tipo === "positivo"
                                ? "bg-green-500"
                                : "bg-gray-400"
                              }`}
                            style={{ width: `${s.porcentaje}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{t('No hay datos de sentimientos disponibles')}</p>
                )}
              </CardContent>
            </Card>
            
          </div>
        </>
      )}

      {/* Estado inicial */}
      {!provinciaSeleccionada && !loading && (
        <Card className="border-border mb-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">
                {t('Selecciona_una_provincia')}
              </h3>
              <p className="text-muted-foreground font-[family-name:var(--font-dm-sans)] max-w-md text-pretty">
                {t('Elige_una_provincia')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de Detalle de Transcripción */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
  <DialogContent className="w-full sm:w-[90%] lg:w-[85%] lg:max-w-[90%] xl:w-[90%] max-h-[90vh] p-2 sm:p-6 overflow-y-auto">
          <DialogHeader className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 pt-8">
            <DialogTitle className="text-xl sm:text-2xl font-[family-name:var(--font-space-grotesk)]">
              <Brain className="h-6 w-6 text-primary inline-block mr-2" />
              {t('Detalle de Transcripción con IA')}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base font-[family-name:var(--font-dm-sans)]">
              {t('Información detallada de la transcripción y su análisis con inteligencia artificial')}
            </DialogDescription>
          </DialogHeader>

          {detalleTranscripcion && (
            <div className="space-y-6">
              {/* Audio */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg font-[family-name:var(--font-space-grotesk)]">{t('Audio')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {detalleTranscripcion.path ? (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <audio controls className="w-full">
                        <source src={detalleTranscripcion.path} type="audio/mp3" />
                        {t('Tu navegador no soporta el elemento de audio.')}
                      </audio>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground p-3 bg-muted/50 rounded-lg">
                      <Info className="h-5 w-5 flex-shrink-0" />
                      <p className="text-sm font-[family-name:var(--font-dm-sans)]">
                        {t('No hay audio disponible para esta transcripción')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transcripción */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg font-[family-name:var(--font-space-grotesk)]">{t('Transcripción')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-3">
                    {detalleTranscripcion.transcripcion ? (
                      <p className="text-sm sm:text-base text-muted-foreground font-[family-name:var(--font-dm-sans)] leading-relaxed">
                        {detalleTranscripcion.transcripcion}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Info className="h-5 w-5 flex-shrink-0" />
                        <p className="text-sm font-[family-name:var(--font-dm-sans)]">
                          {t('No hay transcripción disponible')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Nube de Palabras */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg font-[family-name:var(--font-space-grotesk)]">
                    {t('Nube_de_Palabras')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-3">
                    {JSON.parse(detalleTranscripcion.analisis).nube_palabras?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {JSON.parse(detalleTranscripcion.analisis).nube_palabras.map((item: { palabra: string; frecuencia: number }, index: number) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="font-[family-name:var(--font-dm-sans)] text-white transition-all duration-200"
                            style={{
                              fontSize: `${Math.max(0.65 + (item.frecuencia * 0.15), 0.8)}rem`,
                              opacity: Math.max(0.7 + (item.frecuencia * 0.1), 1)
                            }}
                          >
                            {item.palabra} ({item.frecuencia})
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Info className="h-5 w-5 flex-shrink-0" />
                        <p className="text-sm font-[family-name:var(--font-dm-sans)]">
                          {t('No_hay_palabras_frecuentes_para_mostrar')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Análisis */}
              {detalleTranscripcion.analisis && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Problemas y Demandas */}
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg font-[family-name:var(--font-space-grotesk)]">
                        {t('Problemas_Identificados')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-3">
                        {JSON.parse(detalleTranscripcion.analisis).problemas?.length > 0 ? (
                          <ul className="list-disc pl-4 space-y-2">
                            {JSON.parse(detalleTranscripcion.analisis).problemas.map((problema: string, index: number) => (
                              <li key={index} className="text-sm sm:text-base text-muted-foreground font-[family-name:var(--font-dm-sans)] leading-relaxed">
                                {problema}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Info className="h-5 w-5 flex-shrink-0" />
                            <p className="text-sm font-[family-name:var(--font-dm-sans)]">
                              {t('No_se_identificaron_problemas')}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg font-[family-name:var(--font-space-grotesk)]">
                        {t('Demandas_Identificadas')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-3">
                        {JSON.parse(detalleTranscripcion.analisis).demandas?.length > 0 ? (
                          <ul className="list-disc pl-4 space-y-2">
                            {JSON.parse(detalleTranscripcion.analisis).demandas.map((demanda: string, index: number) => (
                              <li key={index} className="text-sm sm:text-base text-muted-foreground font-[family-name:var(--font-dm-sans)] leading-relaxed">
                                {demanda}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Info className="h-5 w-5 flex-shrink-0" />
                            <p className="text-sm font-[family-name:var(--font-dm-sans)]">
                              {t('No_se_identificaron_demandas')}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Conclusión y Sentimiento */}
                  <Card className="md:col-span-2 mb-2">
                    <CardHeader>
                      <CardTitle className="text-sm font-[family-name:var(--font-space-grotesk)]">
                        {t('Conclusion_y_Sentimiento')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2 font-[family-name:var(--font-space-grotesk)]">{t('Conclusion')}</h4>
                        {JSON.parse(detalleTranscripcion.analisis).conclusion ? (
                          <p className="text-sm text-muted-foreground font-[family-name:var(--font-dm-sans)]">
                            {JSON.parse(detalleTranscripcion.analisis).conclusion}
                          </p>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Info className="h-5 w-5" />
                            <p className="text-sm font-[family-name:var(--font-dm-sans)]">
                              {t('No_hay_conclusion_disponible')}
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 font-[family-name:var(--font-space-grotesk)]">{t('Sentimiento')}</h4>
                        {JSON.parse(detalleTranscripcion.analisis).sentimiento ? (
                          <>
                            <Badge className="text-transform: uppercase"
                              variant={JSON.parse(detalleTranscripcion.analisis).sentimiento.tipo === "negativo" ? "destructive" : "default"}
                            >
                              {JSON.parse(detalleTranscripcion.analisis).sentimiento.tipo}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-2 font-[family-name:var(--font-dm-sans)]">
                              {JSON.parse(detalleTranscripcion.analisis).sentimiento.justificacion}
                            </p>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Info className="h-5 w-5" />
                            <p className="text-sm font-[family-name:var(--font-dm-sans)]">
                              {t('No_hay_analisis_de_sentimiento_disponible')}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>


                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalle por Departamento */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
    <DialogContent className="w-[calc(100%)] sm:w-[90%] lg:max-w-[90%] lg:w-[85%] xl:w-[80%] max-h-[90vh] p-2 sm:p-6 overflow-y-auto">
          <DialogHeader className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 pt-8">
            <DialogTitle className="text-xl sm:text-2xl font-[family-name:var(--font-space-grotesk)]">
              {t('Detalle_de', { department: selectedDepartment })}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base font-[family-name:var(--font-dm-sans)]">
              {t('Distribucion_de_problematicas_por_categoria_en_el_departamento')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card className="border-border mb-2">
              <CardHeader>
                <CardTitle className="font-[family-name:var(--font-space-grotesk)]">
                  {t('Distribución por Categoría')}
                </CardTitle>
                <CardDescription className="font-[family-name:var(--font-dm-sans)]">
                  {t('Distribución detallada por categoría en', { department: selectedDepartment })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tabla en desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">{t('Categoría')}</th>
                        <th className="text-left p-3 font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">{t('Cantidad')}</th>
                        <th className="text-left p-3 font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]">{t('Porcentaje')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(
                        problematicas
                          .filter(prob => prob.departamento === selectedDepartment)
                          .reduce((acc, item) => {
                            let categoria = item.categoria!.replace(/^CAT_/, "").replace(/_/g, " ") || "Sin categoría"
                            categoria = categoria.replace(/_/g, " ");
                            acc[categoria] = (acc[categoria] || 0) + 1
                            return acc
                          }, {} as Record<string, number>)
                      )
                        .sort(([, cantidadA], [, cantidadB]) => cantidadB - cantidadA)
                        .map(([categoria, cantidad]) => {
                          const totalDepartamento = problematicas.filter(p => p.departamento === selectedDepartment).length
                          const porcentaje = ((cantidad / totalDepartamento) * 100).toFixed(1)
                          return (
                            <tr key={categoria} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="p-3 font-[family-name:var(--font-dm-sans)]">{categoria}</td>
                              <td className="p-3 font-[family-name:var(--font-dm-sans)]">
                                <Badge variant="outline" className="font-mono text-xs">{cantidad}</Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-muted rounded-full h-2 max-w-[200px]">
                                    <div className="h-2 rounded-full transition-all bg-primary" style={{ width: `${porcentaje}%` }}></div>
                                  </div>
                                  <span className="text-sm text-muted-foreground font-[family-name:var(--font-dm-sans)]">{porcentaje}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {/* Cards en mobile */}
                <div className="block sm:hidden space-y-3">
                  {Object.entries(
                    problematicas
                      .filter(prob => prob.departamento === selectedDepartment)
                      .reduce((acc, item) => {
                        let categoria = item.categoria!.replace(/^CAT_/, "").replace(/_/g, " ") || "Sin categoría"
                        categoria = categoria.replace(/_/g, " ");
                        acc[categoria] = (acc[categoria] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                  )
                    .sort(([, cantidadA], [, cantidadB]) => cantidadB - cantidadA)
                    .map(([categoria, cantidad]) => {
                      const totalDepartamento = problematicas.filter(p => p.departamento === selectedDepartment).length
                      const porcentaje = ((cantidad / totalDepartamento) * 100).toFixed(1)
                      return (
                        <div key={categoria} className="rounded-xl border border-border bg-card shadow-sm p-3 flex flex-col gap-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs px-2 py-1">{cantidad}</Badge>
                            <span className="text-xs text-muted-foreground">{t(categoria.replace(/ /g, '_')) || categoria}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-muted rounded-full h-2 max-w-[200px]">
                              <div className="h-2 rounded-full transition-all bg-primary" style={{ width: `${porcentaje}%` }}></div>
                            </div>
                            <span className="text-sm text-muted-foreground font-[family-name:var(--font-dm-sans)]">{porcentaje}%</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Resumen de Categoría - Versión con UX Mejorada */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
  <DialogContent className="w-full sm:w-[90%] lg:max-w-[90%] lg:w-[85%] xl:w-[80%] max-h-[90vh] p-0 overflow-hidden flex flex-col">
          {/* Header fijo con gradiente, responsive */}
          <div className="flex-shrink-0 bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-sm border-b border-border p-2 sm:p-6">
            <DialogHeader className="pt-8">
              <DialogTitle className="text-base sm:text-2xl font-[family-name:var(--font-space-grotesk)] flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-primary/10 rounded-lg">
                  <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <div className="text-xs sm:text-base">{t('Análisis de Categoría')}</div>
                  <div className="text-xs sm:text-base font-normal text-primary mt-1">{selectedCategory}</div>
                </div>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-base font-[family-name:var(--font-dm-sans)] mt-1 sm:mt-2">
                {t('Análisis detallado generado por IA para esta categoría de problemáticas.')}
              </DialogDescription>
            </DialogHeader>

            {/* Indicadores de progreso y estadísticas */}
            {categoryData?.analisisDetallado && (
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {categoryData.analisisDetallado.length} {t('análisis')}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    • {categoryData.analisisDetallado.reduce((acc: number, item: any) => acc + item.analisis.length, 0).toLocaleString()} {t('caracteres')}
                  </div>
                </div>
                <div className="flex-1 cursor-pointer" />
                <Button
                  variant="outline"
                  size="sm"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const content = categoryData.analisisDetallado.map((item: any) => item.analisis).join('\n\n---\n\n');
                    navigator.clipboard.writeText(content);
                    toast(t("Análisis copiado al portapapeles"))
                  }}
                  className="gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {t('Copiar')}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  style={{ cursor: 'pointer' }}
                  onClick={async () => {
                    // Convierte Markdown a bloques pdfmake (tablas, listas, texto)
                    function parseBold(text: string) {
                      // Detecta **texto** o __texto__ y lo convierte a pdfmake bold
                      const regex = /\*\*(.*?)\*\*|__(.*?)__/g;
                      const parts: any[] = [];
                      let lastIndex = 0;
                      let match;
                      while ((match = regex.exec(text)) !== null) {
                        if (match.index > lastIndex) {
                          parts.push({ text: text.substring(lastIndex, match.index) });
                        }
                        const boldText = match[1] || match[2];
                        parts.push({ text: boldText, bold: true });
                        lastIndex = regex.lastIndex;
                      }
                      if (lastIndex < text.length) {
                        parts.push({ text: text.substring(lastIndex) });
                      }
                      return parts.length > 0 ? parts : text;
                    }

                    function markdownToPdfMakeBlocks(md: string) {
                      const lines = md.split('\n');
                      const blocks: any[] = [];
                      let i = 0;
                      while (i < lines.length) {
                        // Tabla Markdown
                        if (lines[i].includes('|') && lines[i + 1] && lines[i + 1].match(/^\s*\|?\s*-+/)) {
                          // Encuentra todas las líneas de la tabla
                          const tableLines = [];
                          while (i < lines.length && lines[i].includes('|')) {
                            tableLines.push(lines[i]);
                            i++;
                          }
                          // Procesa la tabla
                          const tableRows: any[] = tableLines.map(row => row.split('|').map(cell => parseBold(cell.trim())).filter(Boolean));
                          // El primer row es header, lo ponemos en bold
                          if (tableRows.length > 1) {
                            tableRows[0] = tableRows[0].map((cell:any) => {
                              if (typeof cell === 'string') return { text: cell, bold: true };
                              if (Array.isArray(cell)) return cell.map(part => typeof part === 'object' && !Array.isArray(part) && part !== null ? { ...part, bold: true } : { text: part, bold: true });
                              if (typeof cell === 'object' && cell !== null && !Array.isArray(cell)) return Object.assign({}, cell, { bold: true });
                              return cell;
                            });
                          }
                          const table = {
                            table: {
                              headerRows: 1,
                              widths: Array(tableRows[0].length).fill('*'),
                              body: tableRows
                            },
                            layout: {
                              hLineWidth: function(i: any, node: any) { return 0.5; },
                              vLineWidth: function(i: any, node: any) { return 0.5; },
                              hLineColor: function(i: any, node: any) { return '#000'; },
                              vLineColor: function(i: any, node: any) { return '#000'; },
                              paddingLeft: function(i: any, node: any) { return 4; },
                              paddingRight: function(i: any, node: any) { return 4; },
                              paddingTop: function(i: any, node: any) { return 2; },
                              paddingBottom: function(i: any, node: any) { return 2; }
                            },
                            margin: [0, 10, 0, 10]
                          };
                          blocks.push(table);
                          continue;
                        }
                        // Lista Markdown
                        if (lines[i].match(/^\s*[-*+] /)) {
                          const items = [];
                          while (i < lines.length && lines[i].match(/^\s*[-*+] /)) {
                            items.push(parseBold(lines[i].replace(/^\s*[-*+] /, '').trim()));
                            i++;
                          }
                          blocks.push({ ul: items, margin: [0, 5, 0, 5] });
                          continue;
                        }
                        // Encabezado Markdown
                        if (lines[i].startsWith('## ')) {
                          blocks.push({ text: parseBold(lines[i].replace('## ', '')), style: 'subheader', margin: [0, 10, 0, 5] });
                          i++;
                          continue;
                        }
                        if (lines[i].startsWith('# ')) {
                          blocks.push({ text: parseBold(lines[i].replace('# ', '')), style: 'header', margin: [0, 15, 0, 10] });
                          i++;
                          continue;
                        }
                        // Texto normal o explicativo
                        if (lines[i].trim()) {
                          blocks.push({ text: parseBold(lines[i].trim()), style: 'body', margin: [0, 6, 0, 6] });
                        }
                        i++;
                      }
                      return blocks;
                    }
                    const markdownContent = categoryData.analisisDetallado.map((item: any, idx: number) => `## ${t('Análisis')} #${idx + 1}\n\n${item.analisis}`).join('\n\n---\n\n');
                    const pdfBlocks = markdownToPdfMakeBlocks(markdownContent);
                    const docDefinition = {
                      content: [
                        { text: `${t('Análisis de Categoría')}: ${selectedCategory || ''}`, style: 'header' },
                        ...pdfBlocks
                      ],
                      styles: {
                        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
                        subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 6] },
                        body: { fontSize: 12 },
                      }
                    };
                    pdfMake.createPdf(docDefinition).download(`analisis-categoria-${selectedCategory || ''}.pdf`);
                  }}
                  className="gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                  {t('Exportar PDF')}
                </Button>
              </div>
            )}
          </div>

          {/* Contenido scrolleable - Ahora ocupa el espacio restante */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-6">
            {categoryData?.analisisDetallado ? (
              <div className="space-y-6 pb-4"> {/* Agregamos padding bottom para separación */}
                {categoryData.analisisDetallado.map((item: any, index: number) => (
                  <div key={index} className="relative group">
                    {/* Indicador de posición */}
                    <div className="absolute -left-2 top-6 w-4 h-4 bg-primary/20 rounded-full border-2 border-primary/40 group-hover:border-primary transition-colors">
                      <div className="absolute inset-1 bg-primary rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Línea conectora (excepto para el último elemento) */}
                    {index < categoryData.analisisDetallado.length - 1 && (
                      <div className="absolute -left-1.5 top-10 w-0.5 h-full bg-gradient-to-b from-primary/20 to-transparent" />
                    )}

                    <Card className="border-border ml-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 group-hover:transform group-hover:translate-x-1">
                      <CardContent className="p-6">
                        {/* Header del análisis */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {t('Análisis')} #{index + 1}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {item.analisis.split(' ').length} {t('palabras')} • {Math.ceil(item.analisis.length / 1000)} {t('min lectura')}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            style={{ cursor: 'pointer' }}
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(item.analisis);
                              // Toast de confirmación
                              toast(t("Análisis copiado al portapapeles"))

                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </Button>
                        </div>

                        {/* Contenido markdown mejorado */}
                        {/* Desktop: tabla normal */}
                        <div className="hidden sm:block">
                          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none 
                                prose-headings:font-[family-name:var(--font-space-grotesk)]
                                prose-headings:scroll-mt-20
                                prose-p:font-[family-name:var(--font-dm-sans)]
                                prose-p:leading-relaxed
                                prose-p:mb-4
                                prose-ul:mb-4
                                prose-ol:mb-4
                                prose-li:mb-2
                                prose-li:font-[family-name:var(--font-dm-sans)]
                                prose-strong:font-semibold
                                prose-strong:text-foreground
                                prose-strong:bg-primary/5
                                prose-strong:px-1
                                prose-strong:rounded
                                prose-table:w-full
                                prose-table:border-collapse
                                prose-table:border-border
                                prose-table:rounded-lg
                                prose-table:overflow-hidden
                                prose-table:shadow-sm
                                prose-thead:bg-gradient-to-r
                                prose-thead:from-muted
                                prose-thead:to-muted/80
                                prose-th:border
                                prose-th:border-border
                                prose-th:px-4
                                prose-th:py-3
                                prose-th:text-left
                                prose-th:font-semibold
                                prose-th:text-foreground
                                prose-th:font-[family-name:var(--font-space-grotesk)]
                                prose-td:border
                                prose-td:border-border
                                prose-td:px-4
                                prose-td:py-3
                                prose-td:font-[family-name:var(--font-dm-sans)]
                                prose-tr:hover:bg-primary/5
                                prose-tr:transition-colors
                                prose-tr:duration-150
                                prose-blockquote:border-l-4
                                prose-blockquote:border-primary
                                prose-blockquote:pl-4
                                prose-blockquote:italic
                                prose-blockquote:bg-gradient-to-r
                                prose-blockquote:from-primary/5
                                prose-blockquote:to-transparent
                                prose-blockquote:py-3
                                prose-blockquote:rounded-r-md
                                prose-blockquote:shadow-sm
                                prose-code:bg-muted
                                prose-code:px-2
                                prose-code:py-1
                                prose-code:rounded
                                prose-code:text-sm
                                prose-code:font-mono
                                prose-code:border
                                prose-code:border-border/50
                                prose-pre:bg-gradient-to-br
                                prose-pre:from-muted
                                prose-pre:to-muted/80
                                prose-pre:p-4
                                prose-pre:rounded-lg
                                prose-pre:overflow-x-auto
                                prose-pre:border
                                prose-pre:border-border
                                prose-pre:shadow-sm
                                prose-hr:border-border
                                prose-hr:my-8
                                prose-hr:border-dashed">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({ node, ...props }) => (
                                  <div className="overflow-x-auto my-6 rounded-lg border border-border shadow-sm">
                                    <table className="w-full border-collapse bg-card" {...props} />
                                  </div>
                                ),
                                thead: ({ node, ...props }) => (
                                  <thead className="bg-gradient-to-r from-muted to-muted/80" {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                  <th className="border-r border-border last:border-r-0 px-4 py-3 text-left font-semibold text-foreground font-[family-name:var(--font-space-grotesk)]" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                  <td className="border-r border-t border-border last:border-r-0 px-4 py-3 font-[family-name:var(--font-dm-sans)]" {...props} />
                                ),
                                tr: ({ node, ...props }) => (
                                  <tr className="hover:bg-primary/5 transition-colors duration-150" {...props} />
                                ),
                                p: ({ node, ...props }) => (
                                  <p className="mb-4 leading-relaxed font-[family-name:var(--font-dm-sans)]" {...props} />
                                ),
                                h1: ({ node, ...props }) => (
                                  <h1 className="text-2xl font-bold mb-4 mt-6 font-[family-name:var(--font-space-grotesk)] text-primary scroll-mt-20" {...props} />
                                ),
                                h2: ({ node, ...props }) => (
                                  <h2 className="text-xl font-bold mb-3 mt-5 font-[family-name:var(--font-space-grotesk)] text-primary/90 scroll-mt-20" {...props} />
                                ),
                                h3: ({ node, ...props }) => (
                                  <h3 className="text-lg font-bold mb-3 mt-4 font-[family-name:var(--font-space-grotesk)] text-primary/80 scroll-mt-20" {...props} />
                                ),
                                ul: ({ node, ...props }) => (
                                  <ul className="mb-4 pl-6 space-y-2" {...props} />
                                ),
                                ol: ({ node, ...props }) => (
                                  <ol className="mb-4 pl-6 space-y-2" {...props} />
                                ),
                                li: ({ node, ...props }) => (
                                  <li className="font-[family-name:var(--font-dm-sans)] leading-relaxed relative">
                                    <span className="absolute -left-4 top-0.5 w-2 h-2 bg-primary/40 rounded-full" />
                                    <span {...props} />
                                  </li>
                                ),
                                blockquote: ({ node, ...props }) => (
                                  <blockquote className="border-l-4 border-primary pl-4 italic bg-gradient-to-r from-primary/5 to-transparent py-3 my-6 rounded-r-md shadow-sm" {...props} />
                                ),
                                code: ({ node, inline, ...props }: { node?: any; inline?: boolean; [key: string]: any }) =>
                                  inline ? (
                                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono border border-border/50" {...props} />
                                  ) : (
                                    <code className="block bg-gradient-to-br from-muted to-muted/80 p-4 rounded-lg overflow-x-auto font-mono text-sm border border-border shadow-sm" {...props} />
                                  ),
                                hr: ({ node, ...props }) => (
                                  <hr className="border-border border-dashed my-8" {...props} />
                                ),
                                strong: ({ node, ...props }) => (
                                  <strong className="font-semibold text-foreground bg-primary/5 px-1 rounded" {...props} />
                                )
                              }}
                            >
                              {item.analisis}
                            </ReactMarkdown>
                          </div>
                        </div>
                        {/* Mobile: cards para cada fila de la tabla */}
                        <div className="block sm:hidden">
                          {/* Extrae las tablas del markdown y las muestra como cards */}
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ children }) => {
                                // Extrae filas y columnas de forma segura
                                const rows = Array.isArray(children) ? children.filter(child => child && (child.type === 'thead' || child.type === 'tbody')) : [];
                                let headers: any[] = [];
                                let bodyRows: any[] = [];
                                rows.forEach(row => {
                                  if (row.type === 'thead') {
                                    const theadTr = Array.isArray(row.props.children) ? row.props.children.find((c: any) => c && c.type === 'tr') : row.props.children;
                                    if (theadTr && theadTr.props && Array.isArray(theadTr.props.children)) {
                                      headers = theadTr.props.children.map((th: any) => th && th.props ? th.props.children : '');
                                    }
                                  } else if (row.type === 'tbody') {
                                    const trs = Array.isArray(row.props.children) ? row.props.children : [row.props.children];
                                    bodyRows = trs.map((tr: any) => {
                                      if (tr && tr.props && Array.isArray(tr.props.children)) {
                                        return tr.props.children.map((td: any) => td && td.props ? td.props.children : '');
                                      }
                                      return [];
                                    });
                                  }
                                });
                                return (
                                  <div className="space-y-3 my-3">
                                    {bodyRows.map((cols: any, idx: number) => (
                                      <div key={idx} className="rounded-xl border border-border bg-card shadow-sm p-3 flex flex-col gap-2">
                                        {cols.map((value: any, i: number) => (
                                          <div key={i} className="flex flex-col mb-1">
                                            <span className="text-xs font-semibold text-muted-foreground">{headers[i]}</span>
                                            <span className="text-sm font-[family-name:var(--font-dm-sans)]">{value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                            }}
                          >
                            {item.analisis}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4 max-w-md">
                  <div className="p-4 bg-muted/20 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Info className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)]">
                      {t('No hay datos disponibles')}
                    </h3>
                    <p className="text-sm text-muted-foreground font-[family-name:var(--font-dm-sans)] leading-relaxed">
                      {t('No se encontraron análisis para esta categoría. Esto puede deberse a que no hay datos suficientes o la categoría está vacía.')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="mt-4"
                  >
                    {t('Cerrar')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer con acciones adicionales */}
          {categoryData?.analisisDetallado && (
            <div className="flex-shrink-0 bg-gradient-to-t from-card via-card to-card/95 backdrop-blur-sm border-t border-border p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {t('Análisis generado por IA')} • {new Date().toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className='cursor-pointer'
                    size="sm"
                    onClick={() => {
                      const element = document.querySelector('[role="dialog"] .flex-1.overflow-y-auto');
                      element?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </Button>
                  <Button
                    variant="default"
                    className='cursor-pointer'
                    size="sm"
                    onClick={() => setIsCategoryModalOpen(false)}
                  >
                    {t('Cerrar')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
