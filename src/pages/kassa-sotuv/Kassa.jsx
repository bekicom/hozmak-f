import React, { useRef, useState } from "react";
import {
  Input,
  Table,
  Card,
  Button,
  Modal,
  Select,
  message,
  Form,
  Input as AntdInput,
  DatePicker,
  AutoComplete,
} from "antd";
import {
  useGetAllProductsQuery,
  useUpdateProductMutation,
} from "../../context/service/addproduct.service";
import { useRecordSaleMutation } from "../../context/service/sale.service";
import {
  useSellProductFromStoreMutation,
  useGetStoreProductsQuery,
} from "../../context/service/store.service";
import {
  useCreateDebtorMutation,
  useGetDebtorsQuery,
} from "../../context/service/debtor.service";
import { useGetUsdRateQuery } from "../../context/service/usd.service";
import "./Kassa.css";
import Qarzdor from "../qarzdorlar/Qarzdor";
import Xarajatlar from "../Xarajatlar/Xarajatlar";
import { useReactToPrint } from "react-to-print";
import moment from "moment-timezone";
import Vazvrat from "../vazvrat/Vazvrat";
import bir from "../../assets/telegram_qr.png";
import SotuvTarix from "../sotuv-tarix/Sotuv_tarix";
const { Option } = Select;

export default function Kassa() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("naqd");
  const [debtorName, setDebtorName] = useState("");
  const [debtorPhone, setDebtorPhone] = useState("");
  const [chekModal, setChekModal] = useState(false);
  const [qarzdorModalVisible, setQarzdorModalVisible] = useState(false);
  const [sotuvModalVisible, setSotuvModalVisible] = useState(false);
  const [xarajatlarModalVisible, setXarajatlarModalVisible] = useState(false);
  const [vazvratModalVisible, setVazvratModalVisible] = useState(false);
  const receiptRef = useRef();
  const [debtDueDate, setDebtDueDate] = useState(null);
  const { data: products, isLoading } = useGetAllProductsQuery();
  const { data: storeProducts } = useGetStoreProductsQuery();
  const { data: usdRateData } = useGetUsdRateQuery();
  const [updateProduct] = useUpdateProductMutation();
  const [recordSale] = useRecordSaleMutation();
  const [sellProductFromStore] = useSellProductFromStoreMutation();
  const [createDebtor] = useCreateDebtorMutation();
  const { data: debtors, refetch } = useGetDebtorsQuery();

  const [location, setLocation] = useState(null);
  const uniqueDebtors = debtors?.reduce((acc, debtor) => {
    if (!acc.find((d) => d.phone === debtor.phone)) {
      acc.push(debtor);
    }
    return acc;
  }, []);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: "new document",
    pageStyle: "style",
    onAfterPrint: () => {
      setChekModal(false);
      setSelectedProducts([]);
    },
  });

  const filteredProducts = searchTerm
    ? products?.filter(
        (product) =>
          product.product_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) || // Поиск по имени продукта
          product.barcode.toLowerCase().includes(searchTerm.toLowerCase()) || // Поиск по штрих-коду
          (product.model &&
            product.model.toLowerCase().includes(searchTerm.toLowerCase())) // Поиск по модели (если есть)
      )
    : [];

  const handleSelectProduct = (product) => {
    const exists = selectedProducts.find((item) => item._id === product._id);
    if (!exists) {
      // Check if stock in "skalad" is 0
      if (product.stock === 0) {
        message.error("Bu tavar omborda tugagan!");
        return;
      }
      setSelectedProducts([
        ...selectedProducts,
        {
          ...product,
          quantity: 1,
          sell_price:
            product.sell_currency === "usd"
              ? product.sell_price * usdRateData.rate
              : product.sell_price,
        },
      ]);
      setSearchTerm("");
    } else {
      message.info("Bu mahsulot allaqachon tanlangan");
    }
  };

  const handleRemoveProduct = (productId) => {
    const updatedProducts = selectedProducts.filter(
      (item) => item._id !== productId
    );
    setSelectedProducts(updatedProducts);
  };

  const handleQuantityChange = (productId, increment) => {
    const updatedProducts = selectedProducts.map((item) => {
      if (item._id === productId) {
        const newQuantity = item.quantity + increment;
        return { ...item, quantity: newQuantity > 0 ? newQuantity : 1 };
      }
      return item;
    });
    setSelectedProducts(updatedProducts);
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const [receiptProducts, setReceiptProducts] = useState([]); // Копия для чека

  const handleSellProducts = async () => {
    setChekModal(true);
    try {
      setReceiptProducts([...selectedProducts]);

      for (const product of selectedProducts) {
        const sellPrice =
          paymentMethod === "usd"
            ? product.sell_price * usdRateData.rate
            : product.sell_price;

        if (location === "skalad") {
          if (product.stock === 0) {
            message.error(
              `${product.product_name} mahsuloti skladada tugagan!`
            );
            return;
          }
          if (product.stock < product.quantity) {
            message.error(
              `${product.product_name} mahsuloti skladada yetarli emas!`
            );
            return;
          }
          const newStock = product.stock - product.quantity;
          await updateProduct({ id: product._id, stock: newStock }).unwrap();
        } else if (location === "dokon") {
          const storeProduct = storeProducts.find(
            (p) => p.product_id?._id === product._id
          );
          if (!storeProduct) {
            message.error(
              `${product.product_name} mahsuloti dokonda mavjud emas!`
            );
            return;
          }
          if (storeProduct.quantity < product.quantity) {
            message.error(
              `${product.product_name} mahsuloti dokonda yetarli emas!`
            );
            return;
          }
          const newStoreStock = storeProduct.quantity - product.quantity;
          await sellProductFromStore({
            product_id: storeProduct.product_id._id,
            quantity: product.quantity,
          }).unwrap();
        }

        if (paymentMethod === "qarz") {
          if (!debtorName || !debtorPhone) {
            message.error("Qarzga sotishda mijozning ismi va telefoni kerak!");
            return;
          }

          const debtor = {
            name: debtorName,
            phone: debtorPhone,
            debt_amount: sellPrice * product.quantity,
            due_date: debtDueDate,
            product_id: product._id,
            product_name: product.product_name,
            sell_price: sellPrice,
            product_quantity: product.quantity,
          };
          await createDebtor(debtor).unwrap();
        } else {
          const sale = {
            product_id: product._id,
            product_name: product.product_name,
            sell_price: sellPrice,
            buy_price: product.purchase_price, // Xarid narxi
            quantity: product.quantity,
            total_price: sellPrice * product.quantity,
            payment_method: paymentMethod,
            usd_rate: usdRateData.rate, // Sotuv vaqtidagi USD kursini saqlaymiz
          };
          await recordSale(sale).unwrap();
        }
      }

      message.success("Mahsulotlar muvaffaqiyatli sotildi!");
      setSelectedProducts([]);
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error:", error);
      message.error(
        `Xatolik: ${error.data?.message || "Serverga ulanishda xatolik"}`
      );
    }
  };

  const totalAmount = selectedProducts.reduce((acc, product) => {
    return acc + product.sell_price * product.quantity;
  }, 0);

  const handleSellPriceChange = (productId, newPrice) => {
    const updatedProducts = selectedProducts.map((item) => {
      if (item._id === productId) {
        return {
          ...item,
          sell_price: newPrice,
        };
      }
      return item;
    });
    setSelectedProducts(updatedProducts);
  };

  // AutoComplete uchun options
  const debtorOptions = uniqueDebtors?.map((debtor) => ({
    value: debtor.name,
    label: `${debtor.name} (${debtor.phone})`,
    debtor,
  }));

  // AutoComplete dan tanlangan qarzdorning ma'lumotlarini o'rnatish
  const handleDebtorSelect = (value, option) => {
    setDebtorName(option.debtor.name);
    setDebtorPhone(option.debtor.phone);
  };

  return (
    <div className="kassa-container">
      <Modal
        open={chekModal}
        style={{ display: "flex", justifyContent: "center" }}
        onCancel={() => setChekModal(false)}
        footer={[
          <Button type="primary" onClick={handlePrint}>
            Chop etish
          </Button>,
        ]}
        title="To'lov cheki"
      >
        <div
          className="receipt"
          ref={receiptRef}
          style={{
            width: "80mm",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            paddingInline: "2px",
            gap: "6px",
            display: "flex",
          }}
        >
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            DOKON <br />
          </h1>
          <div className="chek_item3">
            <h1
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {/* LOLA JAXON BOZORI A54 */}
            </h1>
          </div>
          <div className="chek_item">
            <b>
              Sana:{" "}
              <b>{moment().tz("Asia/Tashkent").format("DD.MM.YYYY HH:mm")}</b>
            </b>
          </div>
          <table className="table">
            <thead>
              <tr>
                <td>№</td>
                <td>Tovar</td>
                <td>O'lchov</td>
                <td>Soni</td>
                <td>Summa</td>
              </tr>
            </thead>
            <tbody>
              {receiptProducts?.map((item, index) => (
                <tr key={item._id}>
                  <td style={{ paddingBlock: "20px" }}>{index + 1}</td>
                  <td style={{ paddingBlock: "20px" }}>{item.product_name}</td>
                  <td style={{ paddingBlock: "20px" }}>{item.count_type}</td>
                  <td style={{ paddingBlock: "20px" }}>{item.quantity}</td>
                  <td style={{ paddingBlock: "20px" }}>
                    {(item.quantity * item.sell_price).toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ border: "none" }}></td>
                <td>
                  <h1>Jami:</h1>
                  {receiptProducts
                    .reduce((a, b) => a + b.quantity * b.sell_price, 0)
                    .toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
          <p
            style={{
              fontSize: "20px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            <span>Xaridingiz uchun raxmat!!!</span> <br />
            <span>+998 00 000 00 00</span> <br />
          </p>
        </div>
      </Modal>

      <Modal
        title="Qarzdorlar"
        open={qarzdorModalVisible}
        onCancel={() => setQarzdorModalVisible(false)}
        footer={null}
        width="80%"
      >
        <Qarzdor />
      </Modal>

      <Modal
        title="Xarajatlar"
        open={xarajatlarModalVisible}
        onCancel={() => setXarajatlarModalVisible(false)}
        footer={null}
        width="80%"
      >
        <Xarajatlar />
      </Modal>

      <Modal
        title="Vazvrat tavarlar"
        open={vazvratModalVisible}
        onCancel={() => setVazvratModalVisible(false)}
        footer={null}
        width="80%"
      >
        <Vazvrat />
      </Modal>
      <Modal
        title="Sotish"
        open={sotuvModalVisible}
        onCancel={() => setSotuvModalVisible(false)}
        footer={null}
        width="80%"
      >
        <SotuvTarix />
      </Modal>

      <div className="kassa-header">
        <Button
          type="primary"
          onClick={() => setQarzdorModalVisible(true)}
          style={{ marginRight: 10 }}
        >
          Qarzdorlar
        </Button>
        <Button
          type="primary"
          onClick={() => setXarajatlarModalVisible(true)}
          style={{ marginRight: 10 }}
        >
          Xarajatlar
        </Button>
        <Button
          type="primary"
          onClick={() => setVazvratModalVisible(true)}
          style={{ marginRight: 10 }}
        >
          Vazvrat tavarlar
        </Button>
        <Button
          type="primary"
          onClick={() => setSotuvModalVisible(true)}
          style={{ marginRight: 10 }}
        >
          Sotuv Tarixi
        </Button>
      </div>

      <Card
        title="Kassa"
        bordered={false}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "column-reverse",
          alignItems: "stretch",
          backgroundColor: "#0F4C81",
          width: "80%",
          height: "100%",
          color: "white",
          borderRadius: 0.1,
          overflow: "auto",
        }}
        id="kassa"
      >
        <Input
          placeholder="shtrix kodi, mahsulot nomi yoki modeli bo'yicha qidirish..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: 20, width: "40%" }}
          size="large"
        />

        <Table
          dataSource={filteredProducts}
          loading={isLoading}
          style={{ width: "100%" }}
          columns={[
            {
              title: "Mahsulot nomi",
              dataIndex: "product_name",
              key: "product_name",
            },
            { title: "Modeli", dataIndex: "model", key: "model" },
            {
              title: "Tan narxi",
              dataIndex: "purchase_price",
              key: "purchase_price",
              render: (text, record) =>
                `${text.toFixed(2)} ${
                  record.sell_currency === "usd" ? "$" : "so'm"
                }`,
            },
            {
              title: "Narxi",
              dataIndex: "sell_price",
              key: "sell_price",
              render: (text, record) =>
                `${text.toFixed(2)} ${
                  record.sell_currency === "usd" ? "$" : "so'm"
                }`,
            },
            { title: "Skalad Miqdori", dataIndex: "stock", key: "stock" },
            {
              title: "Dokon Miqdori",
              dataIndex: "quantity",
              key: "quantity",
              render: (_, record) => {
                return storeProducts.find(
                  (product) => product.product_id?._id === record._id
                )?.quantity;
              },
            },
            { title: "Shtrix kod", dataIndex: "barcode", key: "barcode" },
            {
              title: "kimdan-kelgan",
              dataIndex: "kimdan_kelgan",
              key: "kimdan_kelgan",
            },
            {
              title: "Harakatlar",
              key: "actions",
              render: (_, record) => (
                <Button
                  type="primary"
                  onClick={() => handleSelectProduct(record)}
                >
                  Tanlash
                </Button>
              ),
            },
          ]}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />

        {selectedProducts.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h2>Tanlangan mahsulotlar:</h2>
            <Table
              dataSource={selectedProducts}
              style={{ width: "100%" }}
              columns={[
                {
                  title: "Mahsulot nomi",
                  dataIndex: "product_name",
                  key: "product_name",
                },
                {
                  title: "Model",
                  dataIndex: ["model"],
                  key: "model",
                },
                {
                  title: "Tan narxi",
                  dataIndex: "purchase_price",
                  key: "purchase_price",
                },
                {
                  title: "Narxi",
                  render: (_, record) => (
                    <AntdInput
                      value={record.sell_price}
                      onChange={(e) =>
                        handleSellPriceChange(record._id, e.target.value)
                      }
                    />
                  ),
                },
                { title: "Miqdori", dataIndex: "quantity", key: "quantity" },
                { title: "Shtrix kod", dataIndex: "barcode", key: "barcode" },
                {
                  title: "Dokondagi miqdor",
                  dataIndex: "quantity",
                  key: "quantity",
                  render: (_, record) => {
                    return storeProducts.find(
                      (product) => product.product_id?._id === record._id
                    )?.quantity;
                  },
                },
                {
                  title: "Soni",
                  key: "quantity",
                  render: (_, record) => (
                    <div>
                      <Button
                        onClick={() => handleQuantityChange(record._id, -1)}
                        disabled={record.quantity <= 1}
                      >
                        -
                      </Button>
                      <span style={{ margin: "0 10px" }}>
                        {record.quantity}
                      </span>
                      <Button
                        onClick={() => handleQuantityChange(record._id, 1)}
                      >
                        +
                      </Button>
                    </div>
                  ),
                },
                {
                  title: "Harakatlar",
                  key: "actions",
                  render: (_, record) => (
                    <Button
                      type="primary"
                      danger
                      onClick={() => handleRemoveProduct(record._id)}
                    >
                      O'chirish
                    </Button>
                  ),
                },
              ]}
              rowKey="_id"
              pagination={false}
            />

            <div style={{ marginTop: 20, fontSize: "1.5em" }}>
              <strong>Umumiy summa: </strong>
              {totalAmount.toFixed(2)} so'm
            </div>
            <Button
              type="primary"
              onClick={showModal}
              style={{ marginTop: 20 }}
            >
              Sotish
            </Button>
          </div>
        )}

        <Modal
          title="To'lov usulini tanlang"
          visible={isModalVisible}
          onOk={handleSellProducts}
          onCancel={handleCancel}
        >
          <Form layout="vertical">
            <Form.Item label="To'lov usuli">
              <Select
                value={paymentMethod}
                onChange={(value) => setPaymentMethod(value)}
                style={{ width: "100%" }}
              >
                <Option value="naqd">Naqd</Option>
                <Option value="plastik">Karta</Option>
                <Option value="qarz">Qarz</Option>
              </Select>
            </Form.Item>
            {paymentMethod === "qarz" && (
              <>
                <Form.Item label="Qarz oluvchi ismi">
                  <AutoComplete
                    options={debtorOptions}
                    value={debtorName}
                    onSelect={handleDebtorSelect}
                    onChange={(value) => setDebtorName(value)}
                    placeholder="Qarz oluvchi ismi"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
                <Form.Item label="Qarz oluvchi telefon raqami">
                  <AutoComplete
                    options={debtorOptions}
                    value={debtorPhone}
                    onSelect={handleDebtorSelect}
                    onChange={(value) => setDebtorPhone(value)}
                    placeholder="Qarz oluvchi telefon raqami"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
                <Form.Item label="Qarz muddatini kiriting">
                  <DatePicker
                    value={debtDueDate}
                    onChange={(date) => setDebtDueDate(date)}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </>
            )}

            <Form.Item label="Joylashuv">
              <Select
                value={location}
                onChange={(value) => setLocation(value)}
                style={{ width: "100%" }}
              >
                <Option value="skalad">Skalad</Option>
                <Option value="dokon">Dokon</Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
}
