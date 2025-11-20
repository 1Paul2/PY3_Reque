// src/GeneradorPDF.jsx
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const GeneradorPDF = {
  generarCotizacionPDF: async (cotizacion) => {
    try {
      console.log('Iniciando generación de PDF para:', cotizacion);

      // Crear un nuevo documento PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const { width, height } = page.getSize();
      
      // Obtener fuentes
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // **AGREGAR IMAGEN DE FONDO - VERSIÓN CORREGIDA**
      try {
        // Usar la ruta completa de la imagen
        const imageUrl = `${window.location.origin}/old-car-at-shop-cmoqec8v43avgin8.jpg`;
        console.log('Intentando cargar imagen desde:', imageUrl);
        
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const imageBytes = await response.arrayBuffer();
        
        // Detectar el tipo de imagen
        const uint8Array = new Uint8Array(imageBytes);
        let image;
        
        // Verificar si es JPEG (empieza con FF D8 FF)
        if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
          image = await pdfDoc.embedJpg(imageBytes);
        } 
        // Verificar si es PNG (empieza con 89 50 4E 47)
        else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          throw new Error('Formato de imagen no soportado');
        }
        
        // Dibujar imagen de fondo
        const imageDims = image.scale(0.3); // Reducir tamaño para mejor rendimiento
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: width,
          height: height,
          opacity: 0.2, // 20% de opacidad
        });
        
        console.log('Imagen de fondo agregada correctamente');
        
      } catch (imageError) {
        console.warn('No se pudo cargar la imagen de fondo:', imageError);
        // Continuar sin fondo si hay error
      }

      // **ENCABEZADO AZUL**
      page.drawRectangle({
        x: 0,
        y: height - 100,
        width: width,
        height: 100,
        color: rgb(0.05, 0.15, 0.3),  // Azul medianoche muy oscuro
      });

      // Título principal
      page.drawText(cotizacion.esProforma ? 'PROFORMA' : 'COTIZACIÓN', {
        x: width / 2,
        y: height - 40,
        size: 24,
        font: fontBold,
        color: rgb(1, 1, 1), // Blanco
      });

      // Información de la empresa
      page.drawText('Taller Mecánico Especializado', {
        x: width / 2,
        y: height - 65,
        size: 14,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText('Tel: 2222-2222 | Email: taller@ejemplo.com', {
        x: width / 2,
        y: height - 80,
        size: 10,
        font: font,
        color: rgb(1, 1, 1),
      });

      let yPosition = height - 140;

      // **INFORMACIÓN DEL CLIENTE - SIN FONDO**
      page.drawText('INFORMACIÓN DEL CLIENTE', {
        x: 50,
        y: yPosition,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      page.drawText(`Cliente: ${cotizacion.clienteNombre || 'No especificado'}`, {
        x: 50,
        y: yPosition - 20,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Cédula: ${cotizacion.clienteCedula || 'No especificado'}`, {
        x: 50,
        y: yPosition - 35,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Vehículo: ${cotizacion.vehiculoPlaca || 'No especificado'}`, {
        x: 50,
        y: yPosition - 50,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      // **INFORMACIÓN DE LA COTIZACIÓN (lado derecho)**
      page.drawText(`Código: ${cotizacion.codigo || 'N/A'}`, {
        x: 350,
        y: yPosition - 20,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Fecha: ${new Date().toLocaleDateString()}`, {
        x: 350,
        y: yPosition - 35,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      if (cotizacion.codigoOrdenTrabajo) {
        page.drawText(`OT: ${cotizacion.codigoOrdenTrabajo}`, {
          x: 350,
          y: yPosition - 50,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });
      }

      yPosition -= 80;

      // **REPUESTOS - SOLO ENCABEZADOS CON FONDO**
      if (cotizacion.repuestos && cotizacion.repuestos.length > 0) {
        page.drawText('REPUESTOS', {
          x: 50,
          y: yPosition,
          size: 14,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
        });

        yPosition -= 25;

        // **ENCABEZADOS DE TABLA CON FONDO GRIS** (MANTENIDO)
        page.drawRectangle({
          x: 40,
          y: yPosition - 5,
          width: width - 80,
          height: 20,
          color: rgb(0.4, 0.5, 0.6),  // Más oscuro, se ve mejor
        });

        page.drawText('Descripción', {
          x: 50,
          y: yPosition,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        page.drawText('Cantidad', {
          x: 300,
          y: yPosition,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        page.drawText('Precio Unit.', {
          x: 370,
          y: yPosition,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        page.drawText('Subtotal', {
          x: 450,
          y: yPosition,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        yPosition -= 25;

        // Datos de repuestos - SIN FONDOS ALTERNADOS
        cotizacion.repuestos.forEach((repuesto, index) => {
          if (yPosition < 150) {
            // Agregar nueva página si nos quedamos sin espacio
            const newPage = pdfDoc.addPage([595.28, 841.89]);
            yPosition = height - 50;
          }

          page.drawText(repuesto.nombre || 'N/A', {
            x: 50,
            y: yPosition,
            size: 9,
            font: font,
            color: rgb(0, 0, 0),
          });

          page.drawText(String(repuesto.cantidad || 0), {
            x: 300,
            y: yPosition,
            size: 9,
            font: font,
            color: rgb(0, 0, 0),
          });

          page.drawText(`CRC ${(repuesto.precio || 0).toLocaleString()}`, {
            x: 370,
            y: yPosition,
            size: 9,
            font: font,
            color: rgb(0, 0, 0),
          });

          page.drawText(`CRC ${((repuesto.cantidad || 0) * (repuesto.precio || 0)).toLocaleString()}`, {
            x: 450,
            y: yPosition,
            size: 9,
            font: font,
            color: rgb(0, 0, 0),
          });

          yPosition -= 18;
        });

        yPosition -= 20;
      }

      // **MANO DE OBRA - SOLO ENCABEZADOS CON FONDO**
      if (cotizacion.manoObra && cotizacion.manoObra.length > 0) {
        page.drawText('MANO DE OBRA', {
          x: 50,
          y: yPosition,
          size: 14,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
        });

        yPosition -= 25;

        // **ENCABEZADOS DE TABLA CON FONDO GRIS** (MANTENIDO)
        page.drawRectangle({
          x: 40,
          y: yPosition - 5,
          width: width - 80,
          height: 20,
          color: rgb(0.4, 0.5, 0.6),  // Más oscuro, se ve mejor
        });

        page.drawText('Servicio', {
          x: 50,
          y: yPosition,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        page.drawText('Precio', {
          x: 450,
          y: yPosition,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        yPosition -= 25;

        // Datos de mano de obra - SIN FONDOS ALTERNADOS
        cotizacion.manoObra.forEach((servicio, index) => {
          if (yPosition < 150) {
            const newPage = pdfDoc.addPage([595.28, 841.89]);
            yPosition = height - 50;
          }

          page.drawText(servicio.nombre || 'N/A', {
            x: 50,
            y: yPosition,
            size: 9,
            font: font,
            color: rgb(0, 0, 0),
          });

          page.drawText(`CRC ${(servicio.tarifa || 0).toLocaleString()}`, {
            x: 450,
            y: yPosition,
            size: 9,
            font: font,
            color: rgb(0, 0, 0),
          });

          yPosition -= 18;
        });

        yPosition -= 20;
      }

      // **TOTALES SIN CUADRO**
      const subtotalRepuestos = (cotizacion.repuestos || []).reduce((sum, r) => sum + ((r.cantidad || 0) * (r.precio || 0)), 0);
      const subtotalManoObra = (cotizacion.manoObra || []).reduce((sum, s) => sum + (s.tarifa || 0), 0);
      const descuento = (subtotalManoObra * ((cotizacion.descuentoManoObra || 0))) / 100;
      const subtotal = subtotalRepuestos + subtotalManoObra - descuento;
      const iva = subtotal * 0.13;
      const total = subtotal + iva;

      // Posición para los totales (esquina inferior izquierda)
      const totalYPosition = 120;

      page.drawText(`Subtotal Repuestos: CRC ${subtotalRepuestos.toLocaleString()}`, {
        x: 50,
        y: totalYPosition + 40,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Subtotal Mano Obra: CRC ${subtotalManoObra.toLocaleString()}`, {
        x: 50,
        y: totalYPosition + 25,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      if (descuento > 0) {
        page.drawText(`Descuento (${cotizacion.descuentoManoObra}%): -CRC ${descuento.toLocaleString()}`, {
          x: 50,
          y: totalYPosition + 10,
          size: 10,
          font: font,
          color: rgb(0.8, 0, 0),
        });

        page.drawText(`IVA (13%): CRC ${iva.toLocaleString()}`, {
          x: 50,
          y: totalYPosition - 5,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`TOTAL: CRC ${total.toLocaleString()}`, {
          x: 50,
          y: totalYPosition - 25,
          size: 14,
          font: fontBold,
          color: rgb(0.9, 0.2, 0.2),
        });
      } else {
        page.drawText(`IVA (13%): CRC ${iva.toLocaleString()}`, {
          x: 50,
          y: totalYPosition + 10,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`TOTAL: CRC ${total.toLocaleString()}`, {
          x: 50,
          y: totalYPosition - 10,
          size: 14,
          font: fontBold,
          color: rgb(0.9, 0.2, 0.2),
        });
      }

      // **PIE DE PÁGINA CENTRADO**
      const pieTexto1 = 'Este documento es una cotización/proforma y no constituye una factura oficial';
      const pieTexto2 = 'Válido por 15 días';

      // Calcular el ancho del texto para centrarlo
      const pieWidth1 = font.widthOfTextAtSize(pieTexto1, 8);
      const pieWidth2 = font.widthOfTextAtSize(pieTexto2, 8);

      page.drawText(pieTexto1, {
        x: (width - pieWidth1) / 2,  // Centrado exacto
        y: 60,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });

      page.drawText(pieTexto2, {
        x: (width - pieWidth2) / 2,  // Centrado exacto
        y: 45,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });

      // **GUARDAR PDF**
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const fileName = `${cotizacion.esProforma ? 'proforma' : 'cotizacion'}_${cotizacion.codigo || 'sin_codigo'}.pdf`;
      
      // Descargar el PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar
      URL.revokeObjectURL(url);

      console.log('PDF generado exitosamente:', fileName);
      
    } catch (error) {
      console.error('Error detallado al generar PDF:', error);
      throw new Error(`Error al generar PDF: ${error.message}`);
    }
  }
};

export default GeneradorPDF;