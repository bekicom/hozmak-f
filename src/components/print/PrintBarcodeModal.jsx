import React, { useEffect, useRef } from "react";
import { Modal, Button } from "antd";
import JsBarcode from "jsbarcode";

const PrintBarcodeModal = ({
  visible,
  onCancel,
  barcode,
  productName,
  price,
}) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (visible && barcode && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcode, {
          format: "CODE128",
          width: 2,
          height: 70,
          displayValue: true,
          fontSize: 14,
          margin: 5,
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [visible, barcode]);

  useEffect(() => {
    console.log("Modal props:", { visible, barcode, productName, price }); // Debug log
  }, [visible, barcode, productName, price]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const printContent = barcodeRef.current.outerHTML;

    const formattedPrice = price
      ? `${price.toLocaleString()} so'm`
      : "Narx mavjud emas";

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              flex-direction: column; 
              height: 100vh; 
              font-family: Arial, sans-serif; 
              text-align: center;
            }
            svg { 
              width: 30mm !important;
              height: 20mm !important;
            }
            .product-info {
              margin-top: 5px;
              font-size: 12px;
              display: flex;
              justify-content: center;
              gap: 10px;
            }
            .product-name {
              font-weight: bold;
            }
            .product-price {
              font-weight: normal;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <div class="product-info">
            <div class="product-name">${
              productName || "Noma'lum mahsulot"
            }</div>
            <div class="product-price">${formattedPrice}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  const formattedPrice = price
    ? `${price.toLocaleString()} so'm`
    : "Narx mavjud emas";

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
          Chop Angliyada chop etish
        </Button>,
      ]}
    >
      <div style={{ textAlign: "center" }}>
        <svg ref={barcodeRef}></svg>
        <div
          style={{
            marginTop: 5,
            fontSize: 12,
            display: "flex",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: "bold" }}>
            {/* {productName || "Noma'lum mahsulot"} */}
          </div>
          {/* <div>{formattedPrice}</div> */}
        </div>
      </div>
    </Modal>
  );
};

export default PrintBarcodeModal;
