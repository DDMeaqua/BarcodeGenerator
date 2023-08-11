//@ts-nocheck
import { bitable, FieldType } from "@base-open/web-api";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
window.bitable = bitable;
window.FieldType = FieldType;
let loading = false;

export default async function main(ui: any, t = (s: string) => s) {
  ui.markdown(`
   ${t("title.desc")}
  `);
  ui.form(
    (form: any) => ({
      formItems: [
        form.tableSelect("tableId", {
          label: t("select.table"),
          placeholder: t("select.table.placeholder"),
        }),
        form.fieldSelect("urlFieldId", {
          label: t("select.url"),
          placeholder: t("select.url.placeholder"),
          sourceTable: "tableId",
          filterByTypes: [
            FieldType.Url,
            FieldType.Text,
            FieldType.Phone,
            FieldType.Number,
          ],
        }),

        form.fieldSelect("attachmentFieldId", {
          label: t("select.att"),
          placeholder: t("select.att.placeholder"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Attachment],
        }),
        form.inputNumber("width", {
          label: t("select.qrcode.x"),
          defaultValue: "300",
        }),
        form.inputNumber("height", {
          label: t("select.qrcode.y"),
          defaultValue: "300",
        }),
      ],
      buttons: [t("ok")],
    }),
    async ({ values }: any) => {
      const { tableId, urlFieldId, attachmentFieldId, width, height } = values;

      if (!tableId || !urlFieldId || !attachmentFieldId) {
        ui.message.error(t("error.empty"));
      }
      console.log(values);
      const table = await bitable.base.getTableById(tableId);
      const field = await table.getFieldById(urlFieldId);
      const valueList = await field.getFieldValueList();
      const recordList = valueList.map(({ record_id }) => record_id);
      ui.showLoading(" ");

      for (let i = 0; i < recordList.length; i++) {
        const fieldMeta = await table.getFieldMetaById(urlFieldId);
        let url;
        if (fieldMeta.type === FieldType.Url) {
          const cellValue = await table.getCellValue(urlFieldId, recordList[i]);
          url = cellValue[0].link || cellValue[0].text;
        } else {
          url = await table.getCellString(urlFieldId, recordList[i]!);
        }
        if (url === null || url === "" || url === undefined) {
          continue;
        }
        console.log(recordList[i], "url", url);
        let size, type, qrcodeFile, fileName;

        const generateBarcode = (text) => {
          const canvas = document.createElement("canvas");
          JsBarcode(canvas, text, {
            format: "CODE128",
            displayValue: false,
            width: width,
            height: height,
          });
          return canvas.toDataURL();
        };

        // png
        const qrcodeDataURL = await generateBarcode(url);
        console.log(qrcodeDataURL);

        // 将条形码数据转换为 Blob 对象
        const response = await fetch(qrcodeDataURL);
        const qrcodeBlob = await response.blob();
        size = qrcodeBlob.size;
        type = qrcodeBlob.type;
        fileName = "qrcode.png";
        qrcodeFile = new File([qrcodeBlob], fileName, {
          type: qrcodeBlob.type,
        });

        const tokens = await bitable.base.batchUploadFile([qrcodeFile] as any);
        console.log("tokens", tokens, qrcodeFile);
        const attachments = [
          {
            name: fileName,
            size: qrcodeFile.size,
            type: qrcodeFile.type,
            token: tokens[0],
            timeStamp: Date.now(),
          },
        ];
        await table.setCellValue(attachmentFieldId, recordList[i], attachments);
      }

      ui.hideLoading();
    }
  );
}
