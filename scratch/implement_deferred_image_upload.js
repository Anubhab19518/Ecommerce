const fs = require('fs');

// 1. Update products/page.tsx
const productsPagePath = 'd:/Projects/admin-dashboard/src/app/products/page.tsx';
let productsContent = fs.readFileSync(productsPagePath, 'utf8');

// Add state for pending and deleted images
if (!productsContent.includes('pendingUploadFiles')) {
  productsContent = productsContent.replace(
    `const [isUploadingImages, setIsUploadingImages] = useState(false);`,
    `const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<{ id: string; file: File }[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);`
  );
}

// Reset pending and deleted on open
productsContent = productsContent.replace(
  `const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductImages([]);`,
  `const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductImages([]);
    setPendingUploadFiles([]);
    setDeletedImageIds([]);`
);

productsContent = productsContent.replace(
  `const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProductImages(p.images || []);`,
  `const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProductImages(p.images || []);
    setPendingUploadFiles([]);
    setDeletedImageIds([]);`
);

// Replace handleImageUpload with deferred local preview
const oldImageUpload = `  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingImages(true);
      if (editingProduct?.id) {
        const uploaded = await catalogApi.uploadProductImages(editingProduct.id, Array.from(files));
        setProductImages((prev) => [...prev, ...uploaded]);
        success(\`\${uploaded.length} photo(s) uploaded successfully!\`);
      } else {
        // Data URL previews for new unsaved products
        const newPreviews: ProductImage[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newPreviews.push({
            id: 'img-' + Date.now() + '-' + i,
            productId: 'temp',
            url: dataUrl,
          });
        }
        setProductImages((prev) => [...prev, ...newPreviews]);
        success(\`\${files.length} photo(s) added!\`);
      }
    } catch {
      error('Failed to upload images');
    } finally {
      setIsUploadingImages(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (editingProduct?.id && !imageId.startsWith('img-')) {
      try {
        await catalogApi.deleteProductImage(editingProduct.id, imageId);
      } catch {
        // Ignore
      }
    }
    setProductImages((prev) => prev.filter((img) => img.id !== imageId));
    success('Photo removed');
  };`;

const newImageUpload = `  // Image Upload Handler (Deferred until Save Product is clicked)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newPreviews: ProductImage[] = [];
      const newPending: { id: string; file: File }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tempId = 'pending-img-' + Date.now() + '-' + i;
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newPreviews.push({
          id: tempId,
          productId: editingProduct?.id || 'temp',
          url: dataUrl,
        });
        newPending.push({ id: tempId, file });
      }

      setProductImages((prev) => [...prev, ...newPreviews]);
      setPendingUploadFiles((prev) => [...prev, ...newPending]);
      success(\`\${files.length} photo(s) selected (will be saved when you click Save Product)!\`);
    } catch {
      error('Failed to process image previews');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteImage = (imageId: string) => {
    if (!imageId.startsWith('pending-') && !imageId.startsWith('img-')) {
      setDeletedImageIds((prev) => [...prev, imageId]);
    }
    setPendingUploadFiles((prev) => prev.filter((p) => p.id !== imageId));
    setProductImages((prev) => prev.filter((img) => img.id !== imageId));
    success('Photo removed');
  };`;

if (productsContent.includes(oldImageUpload)) {
  productsContent = productsContent.replace(oldImageUpload, newImageUpload);
}

// Update handleSubmit in products/page.tsx
const oldSubmitBlock = `    try {
      if (editingProduct) {
        removeDeletedProductId(editingProduct.id);

        // Sync images: delete any old database images that were removed in the form
        if (editingProduct.images && editingProduct.images.length > 0) {
          const currentImageIds = new Set(productImages.map((img) => img.id));
          for (const oldImg of editingProduct.images) {
            if (!currentImageIds.has(oldImg.id) && !oldImg.id.startsWith('img-')) {
              await catalogApi.deleteProductImage(editingProduct.id, oldImg.id).catch(() => {});
            }
          }
        }

        const updated = await catalogApi
          .updateProduct(editingProduct.id, {
            name: formData.name,
            slug: formData.slug,
            categoryId: formData.categoryId,
            price: formData.price,
            offerPrice: formData.offerPrice,
            description: formData.description,
            details: formData.details,
            status: formData.status,
            hasVariants: formData.hasVariants,
            ...(formData.hasVariants ? {} : { quantity: formData.quantity }),
          })
          .catch(() => null);

        const newProds = products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                ...updated,
                name: formData.name,
                slug: formData.slug,
                categoryId: formData.categoryId,
                price: formData.price,
                offerPrice: formData.offerPrice,
                quantity: formData.quantity,
                computedQuantity: formData.quantity,
                description: formData.description,
                details: formData.details,
                status: formData.status,
                hasVariants: formData.hasVariants,
                images: productImages,
                updatedAt: new Date().toISOString(),
              }
            : p
        );

        setProducts(newProds);
        saveProductsToLocalStorage(newProds);
        success(\`Product "\${formData.name}" updated successfully!\`);
      } else {
        const created = await catalogApi
          .createProduct({
            name: formData.name,
            slug: formData.slug,
            categoryId: formData.categoryId,
            price: formData.price,
            offerPrice: formData.offerPrice,
            quantity: formData.quantity,
            description: formData.description,
            details: formData.details,
            status: formData.status,
            hasVariants: formData.hasVariants,
          })
          .catch(() => null);

        const newProdId = created?.id || 'prod-' + Date.now();

        const newProd: Product = {
          id: newProdId,
          ecommerceId: organisation?.id || 'store-1',
          name: formData.name,
          slug: formData.slug,
          categoryId: formData.categoryId,
          price: formData.price,
          offerPrice: formData.offerPrice,
          quantity: formData.quantity,
          computedQuantity: formData.quantity,
          description: formData.description,
          details: formData.details,
          status: formData.status,
          hasVariants: formData.hasVariants,
          images: productImages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updated = [newProd, ...products];
        setProducts(updated);
        saveProductsToLocalStorage(updated);
        success(\`Product "\${formData.name}" created successfully!\`);
      }

      setShowAddModal(false);
      setEditingProduct(null);
    } catch {
      error('Failed to save product');
    }`;

const newSubmitBlock = `    try {
      setIsUploadingImages(true);

      if (editingProduct) {
        removeDeletedProductId(editingProduct.id);

        // 1. Delete removed images from backend
        for (const imgId of deletedImageIds) {
          await catalogApi.deleteProductImage(editingProduct.id, imgId).catch(() => {});
        }

        // 2. Upload pending new images
        let newlyUploaded: ProductImage[] = [];
        if (pendingUploadFiles.length > 0) {
          newlyUploaded = await catalogApi.uploadProductImages(
            editingProduct.id,
            pendingUploadFiles.map((p) => p.file)
          ).catch(() => []);
        }

        // 3. Update product metadata
        const updated = await catalogApi
          .updateProduct(editingProduct.id, {
            name: formData.name,
            slug: formData.slug,
            categoryId: formData.categoryId,
            price: formData.price,
            offerPrice: formData.offerPrice,
            description: formData.description,
            details: formData.details,
            status: formData.status,
            hasVariants: formData.hasVariants,
            ...(formData.hasVariants ? {} : { quantity: formData.quantity }),
          })
          .catch(() => null);

        const finalImages = [
          ...productImages.filter((img) => !img.id.startsWith('pending-')),
          ...newlyUploaded,
        ];

        const newProds = products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                ...updated,
                name: formData.name,
                slug: formData.slug,
                categoryId: formData.categoryId,
                price: formData.price,
                offerPrice: formData.offerPrice,
                quantity: formData.quantity,
                computedQuantity: formData.quantity,
                description: formData.description,
                details: formData.details,
                status: formData.status,
                hasVariants: formData.hasVariants,
                images: finalImages,
                updatedAt: new Date().toISOString(),
              }
            : p
        );

        setProducts(newProds);
        saveProductsToLocalStorage(newProds);
        success(\`Product "\${formData.name}" updated successfully!\`);
      } else {
        const created = await catalogApi
          .createProduct({
            name: formData.name,
            slug: formData.slug,
            categoryId: formData.categoryId,
            price: formData.price,
            offerPrice: formData.offerPrice,
            quantity: formData.quantity,
            description: formData.description,
            details: formData.details,
            status: formData.status,
            hasVariants: formData.hasVariants,
          })
          .catch(() => null);

        const newProdId = created?.id || 'prod-' + Date.now();

        let newlyUploaded: ProductImage[] = [];
        if (created?.id && pendingUploadFiles.length > 0) {
          newlyUploaded = await catalogApi.uploadProductImages(
            created.id,
            pendingUploadFiles.map((p) => p.file)
          ).catch(() => []);
        }

        const finalImages = newlyUploaded.length > 0 ? newlyUploaded : productImages;

        const newProd: Product = {
          id: newProdId,
          ecommerceId: organisation?.id || 'store-1',
          name: formData.name,
          slug: formData.slug,
          categoryId: formData.categoryId,
          price: formData.price,
          offerPrice: formData.offerPrice,
          quantity: formData.quantity,
          computedQuantity: formData.quantity,
          description: formData.description,
          details: formData.details,
          status: formData.status,
          hasVariants: formData.hasVariants,
          images: finalImages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updated = [newProd, ...products];
        setProducts(updated);
        saveProductsToLocalStorage(updated);
        success(\`Product "\${formData.name}" created successfully!\`);
      }

      setShowAddModal(false);
      setEditingProduct(null);
      setPendingUploadFiles([]);
      setDeletedImageIds([]);
    } catch {
      error('Failed to save product');
    } finally {
      setIsUploadingImages(false);
    }`;

if (productsContent.includes(oldSubmitBlock)) {
  productsContent = productsContent.replace(oldSubmitBlock, newSubmitBlock);
}

fs.writeFileSync(productsPagePath, productsContent, 'utf8');
console.log('Updated products/page.tsx with deferred image upload');

// 2. Update variants/page.tsx
const variantsPagePath = 'd:/Projects/admin-dashboard/src/app/variants/page.tsx';
let variantsContent = fs.readFileSync(variantsPagePath, 'utf8');

if (!variantsContent.includes('pendingVariantUploadFiles')) {
  variantsContent = variantsContent.replace(
    `const [isUploadingVariantImages, setIsUploadingVariantImages] = useState(false);`,
    `const [isUploadingVariantImages, setIsUploadingVariantImages] = useState(false);
  const [pendingVariantUploadFiles, setPendingVariantUploadFiles] = useState<{ id: string; file: File }[]>([]);
  const [deletedVariantImageIds, setDeletedVariantImageIds] = useState<string[]>([]);`
  );
}

// Reset on open edit variant
variantsContent = variantsContent.replace(
  `const handleOpenEditVariant = (v: ProductVariant, index: number) => {
    setEditingVariant(v);
    setEditingVariantIndex(index);
    setVariantImages(v.images || []);`,
  `const handleOpenEditVariant = (v: ProductVariant, index: number) => {
    setEditingVariant(v);
    setEditingVariantIndex(index);
    setVariantImages(v.images || []);
    setPendingVariantUploadFiles([]);
    setDeletedVariantImageIds([]);`
);

// Replace handleVariantImageUpload & handleDeleteVariantImage
const oldVariantUploadMethods = `  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingVariant) return;

    const fd = new FormData();
    Array.from(files).forEach((file) => fd.append('images', file));

    try {
      setIsUploadingVariantImages(true);
      if (!editingVariant.id.startsWith('var-')) {
        const uploaded = await catalogApi.uploadVariantImages(selectedProductId, editingVariant.id, Array.from(files));
        setVariantImages((prev) => [...prev, ...(uploaded.map(img => ({ ...img, variantId: editingVariant.id })))]);
        success(\`\${uploaded.length} photo(s) uploaded for SKU "\${editingVariant.sku}"!\`);
      } else {
        const newPreviews: ProductVariantImage[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newPreviews.push({
            id: 'vimg-' + Date.now() + '-' + i,
            variantId: editingVariant.id,
            url: dataUrl,
          });
        }
        setVariantImages((prev) => [...prev, ...newPreviews]);
        success(\`\${files.length} photo(s) added!\`);
      }
    } catch {
      error('Failed to upload variant photos');
    } finally {
      setIsUploadingVariantImages(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteVariantImage = async (imageId: string) => {
    if (editingVariant && !editingVariant.id.startsWith('var-') && !imageId.startsWith('vimg-')) {
      try {
        await catalogApi.deleteVariantImage(selectedProductId, editingVariant.id, imageId);
      } catch {
        // Ignore
      }
    }
    setVariantImages((prev) => prev.filter((img) => img.id !== imageId));
    success('Variant photo removed');
  };`;

const newVariantUploadMethods = `  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingVariant) return;

    try {
      const newPreviews: ProductVariantImage[] = [];
      const newPending: { id: string; file: File }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tempId = 'pending-vimg-' + Date.now() + '-' + i;
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newPreviews.push({
          id: tempId,
          variantId: editingVariant.id,
          url: dataUrl,
        });
        newPending.push({ id: tempId, file });
      }

      setVariantImages((prev) => [...prev, ...newPreviews]);
      setPendingVariantUploadFiles((prev) => [...prev, ...newPending]);
      success(\`\${files.length} photo(s) selected (will be saved when you click Save Changes)!\`);
    } catch {
      error('Failed to process variant image previews');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteVariantImage = (imageId: string) => {
    if (!imageId.startsWith('pending-') && !imageId.startsWith('vimg-')) {
      setDeletedVariantImageIds((prev) => [...prev, imageId]);
    }
    setPendingVariantUploadFiles((prev) => prev.filter((p) => p.id !== imageId));
    setVariantImages((prev) => prev.filter((img) => img.id !== imageId));
    success('Variant photo removed');
  };`;

if (variantsContent.includes(oldVariantUploadMethods)) {
  variantsContent = variantsContent.replace(oldVariantUploadMethods, newVariantUploadMethods);
}

// Update handleSaveVariantModal in variants/page.tsx
const oldVariantModalSave = `    try {
      if (!editingVariant.id.startsWith('var-')) {
        // Sync variant images: delete any old database images that were removed in the modal
        if (editingVariant.images && editingVariant.images.length > 0) {
          const currentVarImgIds = new Set(variantImages.map((img) => img.id));
          for (const oldImg of editingVariant.images) {
            if (!currentVarImgIds.has(oldImg.id) && !oldImg.id.startsWith('vimg-')) {
              await catalogApi.deleteVariantImage(selectedProductId, editingVariant.id, oldImg.id).catch(() => {});
            }
          }
        }

        await catalogApi
          .updateProductVariant(selectedProductId, editingVariant.id, {
            sku: variantModalFormData.sku,
            price: variantModalFormData.price,
            offerPrice: variantModalFormData.offerPrice,
            quantity: variantModalFormData.quantity,
            status: variantModalFormData.status,
          })
          .catch(() => null);
      }
    } catch {
      // Graceful local update
    }

    const updatedVariants = [...variants];
    updatedVariants[editingVariantIndex] = {
      ...editingVariant,
      sku: variantModalFormData.sku,
      price: variantModalFormData.price,
      offerPrice: variantModalFormData.offerPrice,
      quantity: variantModalFormData.quantity,
      status: variantModalFormData.status,
      images: variantImages,
    };

    setVariants(updatedVariants);
    setEditingVariant(null);
    setEditingVariantIndex(null);
    success(\`Variant "\${variantModalFormData.sku}" updated!\`);`;

const newVariantModalSave = `    try {
      setIsUploadingVariantImages(true);
      let newlyUploaded: ProductVariantImage[] = [];

      if (!editingVariant.id.startsWith('var-')) {
        // 1. Delete removed images from backend
        for (const imgId of deletedVariantImageIds) {
          await catalogApi.deleteVariantImage(selectedProductId, editingVariant.id, imgId).catch(() => {});
        }

        // 2. Upload pending new images
        if (pendingVariantUploadFiles.length > 0) {
          const uploaded = await catalogApi.uploadVariantImages(
            selectedProductId,
            editingVariant.id,
            pendingVariantUploadFiles.map((p) => p.file)
          ).catch(() => []);
          newlyUploaded = uploaded.map((img) => ({ ...img, variantId: editingVariant.id }));
        }

        // 3. Update variant in backend
        await catalogApi
          .updateProductVariant(selectedProductId, editingVariant.id, {
            sku: variantModalFormData.sku,
            price: variantModalFormData.price,
            offerPrice: variantModalFormData.offerPrice,
            quantity: variantModalFormData.quantity,
            status: variantModalFormData.status,
          })
          .catch(() => null);
      }

      const finalImages = [
        ...variantImages.filter((img) => !img.id.startsWith('pending-')),
        ...newlyUploaded,
      ];

      const updatedVariants = [...variants];
      updatedVariants[editingVariantIndex] = {
        ...editingVariant,
        sku: variantModalFormData.sku,
        price: variantModalFormData.price,
        offerPrice: variantModalFormData.offerPrice,
        quantity: variantModalFormData.quantity,
        status: variantModalFormData.status,
        images: finalImages,
      };

      setVariants(updatedVariants);
      setEditingVariant(null);
      setEditingVariantIndex(null);
      setPendingVariantUploadFiles([]);
      setDeletedVariantImageIds([]);
      success(\`Variant "\${variantModalFormData.sku}" updated successfully!\`);
    } catch {
      error('Failed to save variant changes');
    } finally {
      setIsUploadingVariantImages(false);
    }`;

if (variantsContent.includes(oldVariantModalSave)) {
  variantsContent = variantsContent.replace(oldVariantModalSave, newVariantModalSave);
}

fs.writeFileSync(variantsPagePath, variantsContent, 'utf8');
console.log('Updated variants/page.tsx with deferred variant image upload');
