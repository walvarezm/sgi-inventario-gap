function seedInsertDataPermiso() {
    const nombreHoja = 'Permisos'

    Logger.log('⚠️ Inicio creacion de registro en la hoja: ' + nombreHoja )

    const ss = Sheets.getSpreadsheet()
    const sheet = ss.getSheetByName(nombreHoja)
    if (!sheet) throw new Error('Hoja '+ nombreHoja +' no encontrada')

    const id = Sheets.generateId()

    const dataInsert = [
        id,
        'catalogo.ver_boton_exportar',
        'catalogo',
        'ver_boton_exportar',
        'Permiso manual ver_boton_exportar',
        true,
        new Date().toISOString()
    ]
    sheet.appendRow(dataInsert)

    /*Sheets.insert('Permisos', {
        id: id,
        codigo: 'catalogo.ver_boton_exportar',
        modulo: 'catalogo',
        accion: 'ver_boton_exportar',
        descripcion: 'Permiso manual ver_boton_exportar',
        activo: true,
        fecha_creacion: new Date().toISOString()
    })*/

    Logger.log('✅ Registro creado en la hoja ' + nombreHoja + ': ' + codigo)
}