import React, { useState, useEffect } from "react";
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
import PrintBarcodeModal from "../../components/print/PrintBarcodeModal";
import EditProductModal from "../../components/modal/Editmodal"; // Tahrirlash modal komponenti
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { FaPrint } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { IoMdAdd } from "react-icons/io";

const { Option } = Select;

export default function StoreItem() {
  const {
    data: storeProducts,
    isLoading: storeLoading,
    refetch: refetchStoreProducts,
  } = useGetStoreProductsQuery();
  const { data: allProducts, isLoading: productsLoading } =
    useGetAllProductsQuery();
  const [addProductToStore] = useAddProductToStoreMutation();
  const [removeProductFromStore] = useRemoveProductFromStoreMutation();
  const [updateQuantity] = useUpdateQuantityMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("newlyAdded");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState("");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [quantity, setQuantity] = useState(null)
  const [selectedQuantity, setSelectedQuantity] = useState("")
  const [quantityModal, setQuantityModal] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const refetchProducts = () => {
    refetchStoreProducts();
  };

  useEffect(() => {
    refetchStoreProducts();
  }, [stockFilter]);

  const sortedStoreProducts = [...(storeProducts || [])]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .reverse();

  const filteredStoreProducts = sortedStoreProducts
    .filter((product) => {
      const query = searchQuery.toLowerCase();
      const matchesModel = product?.product_id?.model
        .toLowerCase()
        .includes(query);
      const matchesName = product?.product_id?.product_name
        .toLowerCase()
        .includes(query);
      return matchesModel || matchesName;
    })
    .filter((product) => {
      if (stockFilter === "all") return true;
      if (stockFilter === "newlyAdded") return true;
      if (stockFilter === "runningOut")
        return product.quantity <= 5 && product.quantity > 0;
      if (stockFilter === "outOfStock") return product.quantity === 0;
      return false;
    });

  const columns = [
    {
      title: "Maxsulot nomi",
      dataIndex: "product_name",
      key: "product_name",
      render: (text, item) => item?.product_id?.product_name,
    },

    {
      title: "Modeli",
      dataIndex: "modeli",
      key: "modeli",
      render: (text, item) => item?.product_id?.model,
    },
    {
      title: "Miqdor",
      dataIndex: "quantity",
      key: "quantity",
      render: (text, item) => (
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
      dataIndex: "purchase_price",
      key: "purchase_price",
      render: (_, record) => `${record.product_id.purchase_price.toFixed(2)}${record.product_id.purchase_currency === "usd" ? "$" : "so'm"}`, // Narxni USD da ko'rsatish
    },
    {
      title: "Sotish narxi",
      dataIndex: "sell_price",
      key: "sell_price",
      render: (_, record) => `${record.product_id.sell_price.toFixed(2)}${record.product_id.sell_currency === "usd" ? "$" : "so'm"}`, // Narxni USD da ko'rsatish
    },
  
    {
      title: "O'lchov birligi",
      dataIndex: "count_type",
      key: "count_type",
      render: (text, item) => item?.product_id?.count_type,
    },
    {
      title: "kimdan kelgan",
      dataIndex: "kimdan_kelgan",
      key: "kimdan_kelgan",
      render: (text, item) => item?.product_id?.kimdan_kelgan,
    },
    {
      title: "Shtrix kod",
      dataIndex: "barcode",
      key: "barcode",
      render: (text, item) => (
        <div>
          <Button
            type="primary"
            onClick={() => showModal(item?.product_id?.barcode)}
            style={{ marginLeft: 10 }}
          >
            <FaPrint />
          </Button>
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

  const handleFilterChange = (value) => {
    setStockFilter(value);
  };

  const showModal = (barcode) => {
    setSelectedBarcode(barcode);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedBarcode("");
  };

  const showEditModal = (product) => {
    setEditingProduct(product.product_id);
    setIsEditModalVisible(true);
  };

  const handleEditComplete = () => {
    setIsEditModalVisible(false);
    setEditingProduct(null);
    refetchProducts(); // Mahsulotlar ro'yxatini yangilash
  };

  const handleDelete = async (id) => {
    try {
      await removeProductFromStore(id).unwrap();
      message.success("Mahsulot muvaffaqiyatli o'chirildi!");
      refetchProducts(); // Mahsulotlar ro'yxatini yangilash
    } catch (error) {
      message.error("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    }
  };
  function submitModal(data) {
    console.log({ quantity: data.quantity, id: selectedQuantity });
    updateQuantity({ quantity: data.quantity, id: selectedQuantity }).then((res) => {
      message.success("Mahsulot muvaffaqiyatli o'zgartirildi!");
      setQuantityModal(false);
      refetchProducts();
    })

  }
  return (
    <div>
      <Modal open={quantityModal} footer={[]} title="Mahsulot sonini o'zgartirish" onCancel={() => setQuantityModal(false)}>
        <form style={{ paddingInline: "12px", width: "100%", display: "flex", flexDirection: "column", gap: "12px" }} className="modal_form" onSubmit={handleSubmit(submitModal)}>
          <input style={{ width: "40%", paddingInline: "6px", height: "40px", borderRadius: "5px", border: "1px solid #ccc" }} type="number" {...register("quantity")} placeholder="Mahsulot soni" />
          <button style={{ background: "#000", width: "100%", height: "40px", borderRadius: "5px", color: "#fff" }}>O'zgartirish</button>
        </form>
      </Modal>
      <div style={{ display: "flex", marginBottom: 20 }}>
        <Input
          placeholder="Model, nomi bo'yicha qidirish"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginRight: 10 }}
        />
        <Select
          defaultValue="newlyAdded"
          style={{ width: 200, marginLeft: 20 }}
          onChange={handleFilterChange}
        >
          <Option value="newlyAdded">Yangi qo'shilgan mahsulotlar</Option>
          <Option value="all">Barcha mahsulotlar</Option>
          <Option value="runningOut">Tugayotgan mahsulotlar</Option>
          <Option value="outOfStock">Tugagan mahsulotlar</Option>
        </Select>
      </div>
      <AddProductToStore refetchProducts={refetchProducts} />
      <Table
        dataSource={filteredStoreProducts}
        loading={storeLoading}
        columns={columns}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: "max-content" }}
      />
      <PrintBarcodeModal
        visible={isModalVisible}
        onCancel={handleCancel}
        barcode={selectedBarcode}
      />
      <EditProductModal
        visible={isEditModalVisible}
        onCancel={handleEditComplete}
        product={editingProduct}
        onSave={refetchProducts}
        isStore={true}
      />
    </div>
  );
}
