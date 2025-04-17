import React, { useState, useEffect, useRef } from "react";
import { Table, Input, Select, Button, Popconfirm, message, Modal } from "antd";
import {
  useGetStoreProductsQuery,
  useAddProductToStoreMutation,
  useRemoveProductFromStoreMutation,
  useUpdateQuantityMutation,
} from "../../context/service/store.service";
import {
  useGetAllProductsQuery,
  useUpdateProductMutation,
} from "../../context/service/addproduct.service";
import AddProductToStore from "../../components/addproduct/AddProductToStore";
import EditProductModal from "../../components/modal/Editmodal";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { FaPrint } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { IoMdAdd } from "react-icons/io";
import Barcode from "react-barcode";
import ReactToPrint from "react-to-print";

const { Option } = Select;

export default function StoreItem() {
  const {
    data: storeProducts,
    isLoading: storeLoading,
    refetch: refetchStoreProducts,
  } = useGetStoreProductsQuery();

  const { data: allProducts } = useGetAllProductsQuery();
  const [addProductToStore] = useAddProductToStoreMutation();
  const [removeProductFromStore] = useRemoveProductFromStoreMutation();
  const [updateQuantity] = useUpdateQuantityMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("newlyAdded");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState("");
  const [quantityModal, setQuantityModal] = useState(false);
  const { register, handleSubmit, reset } = useForm();
  const [printData, setPrintData] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    refetchStoreProducts();
  }, [stockFilter]);

  const sortedStoreProducts = [...(storeProducts || [])]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .reverse();

  const filteredStoreProducts = sortedStoreProducts
    .filter((product) => {
      const query = searchQuery.toLowerCase();
      const barcodeQuery = barcodeSearch.toLowerCase();
      const name = product?.product_id?.product_name?.toLowerCase() || "";
      const model = product?.product_id?.model?.toLowerCase() || "";
      const barcode = product?.product_id?.barcode?.toLowerCase() || "";
      return (
        (name.includes(query) || model.includes(query)) &&
        (!barcodeQuery || barcode.includes(barcodeQuery))
      );
    })
    .filter((product) => {
      if (stockFilter === "all") return true;
      if (stockFilter === "newlyAdded") return true;
      if (stockFilter === "runningOut")
        return product.quantity <= 5 && product.quantity > 0;
      if (stockFilter === "outOfStock") return product.quantity === 0;
      return false;
    });

  const preparePrintData = (product) => {
    const priceVal = product.product_id?.sell_price ?? 0;
    const priceCurrency =
      product.product_id?.sell_currency === "usd" ? "$" : "so'm";

    return {
      name: product.product_id?.product_name ?? "Noma'lum",
      model: product.product_id?.model ?? "",
      price: `${priceVal.toFixed(0)}${priceCurrency}`,
      barcode: product.product_id?.barcode ?? "0000000000000",
    };
  };

  const columns = [
    {
      title: "Maxsulot nomi",
      key: "product_name",
      render: (_, item) => item?.product_id?.product_name,
    },
    {
      title: "Modeli",
      key: "modeli",
      render: (_, item) => item?.product_id?.model,
    },
    {
      title: "Miqdor",
      key: "quantity",
      render: (_, item) => (
        <div
          style={{
            backgroundColor:
              item.quantity === 0
                ? "red"
                : item.quantity <= 5
                ? "yellow"
                : "inherit",
            display: "inline-block",
            padding: "15px",
            borderRadius: "3px",
          }}
        >
          {item.quantity}
        </div>
      ),
    },
    {
      title: "Olish narxi",
      key: "purchase_price",
      render: (_, record) => {
        const val = record.product_id?.purchase_price ?? 0;
        const currency =
          record.product_id?.purchase_currency === "usd" ? "$" : "so'm";
        return `${val.toFixed(0)}${currency}`;
      },
    },
    {
      title: "Sotish narxi",
      key: "sell_price",
      render: (_, record) => {
        const val = record.product_id?.sell_price ?? 0;
        const currency =
          record.product_id?.sell_currency === "usd" ? "$" : "so'm";
        return `${val.toFixed(0)}${currency}`;
      },
    },
    {
      title: "O'lchov birligi",
      key: "count_type",
      render: (_, item) => item?.product_id?.count_type,
    },
    {
      title: "Kimdan kelgan",
      key: "kimdan_kelgan",
      render: (_, item) => item?.product_id?.kimdan_kelgan,
    },
    {
      title: "Shtrix kod",
      key: "barcode",
      render: (_, item) => (
        <div>
          <span>{item?.product_id?.barcode}</span>
          <ReactToPrint
            trigger={() => (
              <Button
                type="primary"
                style={{ marginLeft: 10 }}
                onClick={() => setPrintData(preparePrintData(item))}
              >
                <FaPrint /> Chop etish
              </Button>
            )}
            content={() => printRef.current}
            onBeforeGetContent={() => setPrintData(preparePrintData(item))}
          />
        </div>
      ),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_, record) => (
        <div>
          <Button
            type="primary"
            style={{ marginRight: "10px" }}
            onClick={() => showEditModal(record)}
          >
            <EditOutlined />
          </Button>
          <Button
            type="primary"
            style={{ marginRight: "10px" }}
            onClick={() => {
              setQuantityModal(true);
              setSelectedQuantity(record._id);
              reset({ quantity: record.quantity });
            }}
          >
            <IoMdAdd />
          </Button>
          <Popconfirm
            title="Haqiqatdan ham ushbu mahsulotni o'chirmoqchimisiz?"
            onConfirm={() => handleDelete(record._id)}
            okText="Ha"
            cancelText="Yo'q"
          >
            <Button type="primary" danger>
              <DeleteOutlined />
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const handleFilterChange = (value) => setStockFilter(value);

  const showEditModal = (product) => {
    setEditingProduct(product.product_id);
    setIsEditModalVisible(true);
  };

  const handleEditComplete = () => {
    setIsEditModalVisible(false);
    setEditingProduct(null);
    refetchStoreProducts();
  };

  const handleDelete = async (id) => {
    try {
      await removeProductFromStore(id).unwrap();
      message.success("Mahsulot muvaffaqiyatli o'chirildi!");
      refetchStoreProducts();
    } catch (error) {
      message.error("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    }
  };

  const submitModal = (data) => {
    updateQuantity({ quantity: data.quantity, id: selectedQuantity }).then(
      () => {
        message.success("Mahsulot muvaffaqiyatli o'zgartirildi!");
        setQuantityModal(false);
        refetchStoreProducts();
      }
    );
  };

  return (
    <div>
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          {printData && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0px",
                width: "300px",
                height: "150px",
                paddingTop: "10px",
                border: "1px solid #000",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                  {printData.name}
                </div>
                <div style={{ fontSize: "12px" }}>{printData.model}</div>
                <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                  {printData.price}
                </div>
              </div>
              <Barcode
                value={printData.barcode}
                width={2}
                height={30}
                displayValue={false}
              />
              <div style={{ marginTop: "5px", fontSize: "10px" }}>
                {printData.barcode}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={quantityModal}
        footer={[]}
        title="Mahsulot sonini o'zgartirish"
        onCancel={() => setQuantityModal(false)}
      >
        <form
          style={{
            paddingInline: "12px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
          className="modal_form"
          onSubmit={handleSubmit(submitModal)}
        >
          <input
            style={{
              width: "40%",
              paddingInline: "6px",
              height: "40px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
            type="number"
            {...register("quantity")}
            placeholder="Mahsulot soni"
          />
          <button
            style={{
              background: "#000",
              width: "100%",
              height: "40px",
              borderRadius: "5px",
              color: "#fff",
            }}
          >
            O'zgartirish
          </button>
        </form>
      </Modal>

      <div style={{ display: "flex", marginBottom: 20, gap: "10px" }}>
        <Input
          placeholder="Model, nomi bo'yicha qidirish"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: "200px" }}
        />
        <Input
          placeholder="Shtrix kod bo'yicha qidirish"
          value={barcodeSearch}
          onChange={(e) => setBarcodeSearch(e.target.value)}
          style={{ width: "200px" }}
        />
        <Select
          defaultValue="newlyAdded"
          style={{ width: 200 }}
          onChange={handleFilterChange}
        >
          <Option value="newlyAdded">Yangi qo'shilgan mahsulotlar</Option>
          <Option value="all">Barcha mahsulotlar</Option>
          <Option value="runningOut">Tugayotgan mahsulotlar</Option>
          <Option value="outOfStock">Tugagan mahsulotlar</Option>
        </Select>
      </div>

      <AddProductToStore refetchProducts={refetchStoreProducts} />
      <Table
        dataSource={filteredStoreProducts}
        loading={storeLoading}
        columns={columns}
        rowKey="_id"
        pagination={{ pageSize: 20, defaultCurrent: 1 }}
        scroll={{ x: "max-content" }}
      />

      <EditProductModal
        visible={isEditModalVisible}
        onCancel={handleEditComplete}
        product={editingProduct}
        onSave={refetchStoreProducts}
        isStore={true}
      />
    </div>
  );
}
