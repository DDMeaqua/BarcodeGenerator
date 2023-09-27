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
          placeholder: t(""),
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
          placeholder: t("长截图"),
          sourceTable: "tableId",
          filterByTypes: [FieldType.Attachment],
        })
      ],
      buttons: [t("ok")],
    }),
    async ({ values }: any) => {
      const { tableId, urlFieldId, attachmentFieldId } = values;

      if (!tableId || !urlFieldId || !attachmentFieldId) {
        ui.message.error(t("error.empty"));
      }

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
