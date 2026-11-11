"""Genera public/plantilla-proyectos-estrategicos.xlsx para la carga masiva.

Las listas desplegables salen de supabase/seed-estrategicos.sql para que la
plantilla y la BD usen exactamente los mismos nombres. Si cambian los
catálogos, volver a correr:  python scripts/generar-plantilla-estrategicos.py
"""
import re
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

RAIZ = Path(__file__).resolve().parent.parent
seed = (RAIZ / "supabase" / "seed-estrategicos.sql").read_text(encoding="utf-8")


def bloque(tabla: str) -> str:
    return seed.split(f"insert into {tabla}")[1].split(";")[0]


dependencias = [n.replace("''", "'") for _, n in re.findall(r"\((\d+), '((?:[^']|'')*)'\)", bloque("est_dependencias"))]
estrategicos = [n.replace("''", "'") for n in re.findall(r"\('((?:[^']|'')*)'\)", bloque("est_proyectos_estrategicos"))]

COLUMNAS = [
    ("Vigencia", 10, None),
    ("Dependencia", 44, None),
    ("Código BPIN", 18, "@"),
    ("Código SAP", 12, "@"),
    ("Nombre del proyecto", 50, None),
    ("Presupuesto inicial", 20, "#,##0"),
    ("Presupuesto total actual", 22, "#,##0"),
    ("Ejecución financiera", 20, "#,##0"),
    ("Proyecto estratégico", 44, None),
    # Texto: si fuera número, Excel convierte "45%" en 0,45 y se pierde la escala.
    ("Porcentaje (%)", 15, "@"),
]
FILAS = 1000
AZUL = PatternFill("solid", fgColor="0A1E3D")

wb = Workbook()
ws = wb.active
ws.title = "Reporte"
for i, (titulo, ancho, formato) in enumerate(COLUMNAS, start=1):
    celda = ws.cell(row=1, column=i, value=titulo)
    celda.font = Font(bold=True, color="FFFFFF")
    celda.fill = AZUL
    celda.alignment = Alignment(vertical="center", wrap_text=True)
    letra = celda.column_letter
    ws.column_dimensions[letra].width = ancho
    if formato:
        for fila in range(2, FILAS + 2):
            ws.cell(row=fila, column=i).number_format = formato
ws.row_dimensions[1].height = 30
ws.freeze_panes = "A2"

listas = wb.create_sheet("Listas")
listas["A1"], listas["B1"] = "Dependencias", "Proyectos estratégicos"
for i, n in enumerate(dependencias, start=2):
    listas.cell(row=i, column=1, value=n)
for i, n in enumerate(estrategicos, start=2):
    listas.cell(row=i, column=2, value=n)
listas.column_dimensions["A"].width = 60
listas.column_dimensions["B"].width = 60

rango = f"2:{FILAS + 1}"
for formula, col, mensaje in [
    ('"2024,2025,2026"', "A", "Elige la vigencia."),
    (f"Listas!$A$2:$A${len(dependencias) + 1}", "B", "Elige la dependencia de la lista."),
    (f"Listas!$B$2:$B${len(estrategicos) + 1}", "I", "Elige el proyecto estratégico de la lista."),
]:
    dv = DataValidation(type="list", formula1=formula, allow_blank=True, showErrorMessage=True,
                        errorTitle="Valor no válido", error=mensaje)
    dv.add(f"{col}{rango.split(':')[0]}:{col}{rango.split(':')[1]}")
    ws.add_data_validation(dv)

ayuda = wb.create_sheet("Instrucciones", 0)
lineas = [
    "Carga masiva · Proyectos estratégicos",
    "",
    "1. Llena la hoja «Reporte». Una fila por cada proyecto estratégico al que aporta un proyecto de inversión.",
    "2. Si un proyecto de inversión aporta a 3 proyectos estratégicos, usa 3 filas: repite vigencia, dependencia,",
    "   BPIN, nombre y presupuestos (deben ser iguales) y cambia solo el proyecto estratégico y el porcentaje.",
    "3. Dependencia, vigencia y proyecto estratégico se eligen de la lista desplegable.",
    "4. Presupuestos en pesos, sin decimales. Porcentaje de 0,01 a 100 (puedes escribir 45 o 45%).",
    "5. La suma de porcentajes de un mismo proyecto no puede pasar de 100.",
    "6. Sube el archivo en la página. Verás los errores antes de enviar y, al final, un archivo con el código",
    "   REP-xxxx y el enlace de corrección de cada proyecto. Guárdalo.",
    "",
    "Ejemplo (hoja Reporte):",
    "2026 | Secretaría de Educación | 2020050010401 | 200328 | NOMBRE DEL PROYECTO | 1.000.000 | 2.000.000 | 1.500.000 | Mayor cuidado | 45",
    "2026 | Secretaría de Educación | 2020050010401 | 200328 | NOMBRE DEL PROYECTO | 1.000.000 | 2.000.000 | 1.500.000 | Cultura ciudadana | 55",
]
for i, t in enumerate(lineas, start=1):
    ayuda.cell(row=i, column=1, value=t)
ayuda["A1"].font = Font(bold=True, size=14, color="0A1E3D")
ayuda.column_dimensions["A"].width = 120
wb.active = 1  # abre directamente en «Reporte»

destino = RAIZ / "public" / "plantilla-proyectos-estrategicos.xlsx"
wb.save(destino)
print(f"{destino.name}: {len(dependencias)} dependencias, {len(estrategicos)} proyectos estratégicos")
