// lib/environment.ts

//export const API_BASE_URL = "https://apiaudioanalysis.azurewebsites.net/api/Problematica";
//export const API_BASE_URL = "https://localhost:7100/api/Problematica";
export const API_BASE_URL = "https://cc210ecba693.sn.mynetname.net:9091/fichachileapi/api/Problematica";

export const ENDPOINTS = {
  problematicasByCodProvincia: (codProvincia: string, tipo?: string, lang?: string) => {
    let url = `${API_BASE_URL}/problematicas-by-codprovincia?codProvincia=${codProvincia}`;
    if (tipo) {
      url += `&tipo=${tipo}`;
    }
    if (lang) {
      url += `&lang=${lang}`;
    }
    return url;
  },
  transcriptionsByProvByDep: (codProvincia: string, departamento: string, tipo?: string) => {
    let url = `${API_BASE_URL}/transcription-by-prov-by-dep?idprov=${codProvincia}&iddep=${departamento}`
    if (tipo) {
      url += `&tipo=${tipo}`;
    }
    return url;
  },
  transcriptionById: (idTranscripcion: number) => `${API_BASE_URL}/transcription-by-id?idTranscription=${idTranscripcion}`,
  problematicasByProvByDepByGrouper: (codProvincia: string, codDepartamento: string, agrupador: string, tipo?: string) => `${API_BASE_URL}/problematicas-by-prov-by-dep-by-grouper?codProvincia=${codProvincia}&codDepartamento=${codDepartamento}&agrupador=${agrupador}&tipo=${tipo || 'problematicas'}`,
};
