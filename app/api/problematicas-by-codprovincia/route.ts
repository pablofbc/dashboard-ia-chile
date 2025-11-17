import { type NextRequest, NextResponse } from "next/server"
import translationES from "@/locales/es/translation.json"
import translationEN from "@/locales/en/translation.json"

// Mapeo de traducciones
const translations = {
  es: translationES,
  en: translationEN,
}

// Datos base sin traducción (usando claves)
const datosBase = {
  COD_DDA: [
    {
      codprovincia: "COD_DDA",
      provincia: "Diego_de_Almagro",
      coddepartamento: "DEP001",
      departamento: "Departamento_Norte",
      codvisita: "V001",
      agrupador: "Infraestructura",
    },
    {
      codprovincia: "COD_DDA",
      provincia: "Diego_de_Almagro",
      coddepartamento: "DEP002",
      departamento: "Departamento_Sur",
      codvisita: "V002",
      agrupador: "Salud",
    },
    {
      codprovincia: "COD_DDA",
      provincia: "Diego_de_Almagro",
      coddepartamento: "DEP001",
      departamento: "Departamento_Norte",
      codvisita: "V003",
      agrupador: "Educacion",
    },
    {
      codprovincia: "COD_DDA",
      provincia: "Diego_de_Almagro",
      coddepartamento: "DEP003",
      departamento: "Departamento_Centro",
      codvisita: "V004",
      agrupador: "Infraestructura",
    },
    {
      codprovincia: "COD_DDA",
      provincia: "Diego_de_Almagro",
      coddepartamento: "DEP002",
      departamento: "Departamento_Sur",
      codvisita: "V005",
      agrupador: "Seguridad",
    },
  ],
  COD_INCA: [
    {
      codprovincia: "COD_INCA",
      provincia: "Inca_de_Oro",
      coddepartamento: "DEP001",
      departamento: "Departamento_Norte",
      codvisita: "V006",
      agrupador: "Salud",
    },
    {
      codprovincia: "COD_INCA",
      provincia: "Inca_de_Oro",
      coddepartamento: "DEP002",
      departamento: "Departamento_Sur",
      codvisita: "V007",
      agrupador: "Educacion",
    },
    {
      codprovincia: "COD_INCA",
      provincia: "Inca_de_Oro",
      coddepartamento: "DEP001",
      departamento: "Departamento_Norte",
      codvisita: "V008",
      agrupador: "Infraestructura",
    },
    {
      codprovincia: "COD_INCA",
      provincia: "Inca_de_Oro",
      coddepartamento: "DEP003",
      departamento: "Departamento_Centro",
      codvisita: "V009",
      agrupador: "Medio_Ambiente",
    },
  ],
  COD_COMU: [
    {
      codprovincia: "COD_COMU",
      provincia: "Comunidades",
      coddepartamento: "DEP001",
      departamento: "Departamento_Norte",
      codvisita: "V010",
      agrupador: "Desarrollo_Social",
    },
    {
      codprovincia: "COD_COMU",
      provincia: "Comunidades",
      coddepartamento: "DEP002",
      departamento: "Departamento_Sur",
      codvisita: "V011",
      agrupador: "Infraestructura",
    },
    {
      codprovincia: "COD_COMU",
      provincia: "Comunidades",
      coddepartamento: "DEP001",
      departamento: "Departamento_Norte",
      codvisita: "V012",
      agrupador: "Salud",
    },
    {
      codprovincia: "COD_COMU",
      provincia: "Comunidades",
      coddepartamento: "DEP003",
      departamento: "Departamento_Centro",
      codvisita: "V013",
      agrupador: "Educacion",
    },
    {
      codprovincia: "COD_COMU",
      provincia: "Comunidades",
      coddepartamento: "DEP002",
      departamento: "Departamento_Sur",
      codvisita: "V014",
      agrupador: "Seguridad",
    },
    {
      codprovincia: "COD_COMU",
      provincia: "Comunidades",
      coddepartamento: "DEP001",
      departamento: "Departamento_Norte",
      codvisita: "V015",
      agrupador: "Desarrollo_Social",
    },
  ],
}

// Función para traducir los datos
function translateData(
  data: typeof datosBase[keyof typeof datosBase],
  language: string
): unknown[] {
  const currentTranslations = translations[language as keyof typeof translations] || translations.es
  const translationsES = translations.es
  const translationsEN = translations.en

  return data.map((item) => ({
    ...item,
    provincia: currentTranslations[item.provincia as keyof typeof currentTranslations] || item.provincia,
    departamento:
      currentTranslations[item.departamento as keyof typeof currentTranslations] || item.departamento,
    agrupador: currentTranslations[item.agrupador as keyof typeof currentTranslations] || item.agrupador,
    textoAgrupador: translationsES[item.agrupador as keyof typeof translationsES] || item.agrupador,
    textoAgrupadorEn: translationsEN[item.agrupador as keyof typeof translationsEN] || item.agrupador,
  }))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const codProvincia = searchParams.get("codProvincia")
  const language = searchParams.get("lang") || "es" // Por defecto español

  if (!codProvincia) {
    return NextResponse.json(
      { error: language === "en" ? "The codProvincia parameter is required" : "El parámetro codProvincia es requerido" },
      { status: 400 }
    )
  }

  // Simulación de delay de red
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const datosBase_var = datosBase[codProvincia as keyof typeof datosBase] || []
  const datos = translateData(datosBase_var, language)

  return NextResponse.json(datos)
}

