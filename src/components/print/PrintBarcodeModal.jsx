import React, { useEffect, useRef } from "react";
import { Modal, Button } from "antd";
import JsBarcode from "jsbarcode";

const PrintBarcodeModal = ({ visible, onCancel, barcode }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (visible && barcode) {
      try {
        JsBarcode(barcodeRef.current, barcode, {
          format: "CODE128",
          width: 2, // Har bir chiziqning kengligi (pikselda)
          height: 70, // Shtrix kodning balandligi (pikselda)
          displayValue: true, // Shtrix kod ostida raqam ko'rsatish
          fontSize: 14, // Raqamning shrift o'lchami
          margin: 5, // Chegaralar
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [visible, barcode]);

  useEffect(() => {
    console.log("Modal holati o'zgardi:", visible);
  }, [visible]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank"); // Yangi oyna ochish
    const printContent = barcodeRef.current.outerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Shtrix kodni chop etish</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              font-family: Arial, sans-serif; 
            }
            svg { 
              width: 30mm !important; /* 4 sm kenglik */
              height: 30mm !important; /* 3 sm balandlik */
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Modal
      title="Shtrix kodni chop etish"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          Bekor qilish
        </Button>,
        <Button key="submit" type="primary" onClick={handlePrint}>
          Chop etish
        </Button>,
      ]}
    >
      <div style={{ textAlign: "center" }}>
        <svg ref={barcodeRef}></svg>
      </div>
    </Modal>
  );
};

export default PrintBarcodeModal;
