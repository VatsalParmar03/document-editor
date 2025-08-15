import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Link,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Download,
  Copy,
  Share2,
  MoreVertical,
  Search,
  Eye,
  Edit3,
  Bookmark,
  MessageSquare,
  Clock,
  ChevronDown,
  Send,
  Menu,
  X,
  Settings,
  Type,
  Palette,
  Highlighter,
  FileText,
  Printer,
  Save,
} from "lucide-react";

// Constants for A4 page dimensions
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 794; // 210mm at 96dpi
const A4_HEIGHT_PX = 1123; // 297mm at 96dpi
const PAGE_MARGIN = 40; // pixels
const HEADER_HEIGHT = 60; // pixels
const FOOTER_HEIGHT = 40; // pixels
const CONTENT_HEIGHT =
  A4_HEIGHT_PX - HEADER_HEIGHT - FOOTER_HEIGHT - PAGE_MARGIN * 2;

// Page Break Component
const PageBreak = ({ pageNumber, isPreview = false }) => (
  <div
    className={`page-break ${isPreview ? "opacity-50" : ""}`}
    style={{
      pageBreakAfter: "always",
      height: "1px",
      borderTop: "2px dashed #e5e7eb",
      margin: "20px 0",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <span className="bg-white px-3 py-1 text-xs text-gray-500 border rounded">
      Page {pageNumber} Break
    </span>
  </div>
);

// Header Component
const PageHeader = ({
  pageNumber,
  totalPages,
  title = "Document Title",
  showInPrint = true,
}) => (
  <div
    className={`page-header ${showInPrint ? "print:block" : "print:hidden"}`}
    style={{
      height: `${HEADER_HEIGHT}px`,
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      fontSize: "12px",
      color: "#6b7280",
    }}
  >
    <div className="font-medium">{title}</div>
    <div>
      Page {pageNumber} of {totalPages}
    </div>
  </div>
);

// Footer Component
const PageFooter = ({ pageNumber, totalPages, showInPrint = true }) => (
  <div
    className={`page-footer ${showInPrint ? "print:block" : "print:hidden"}`}
    style={{
      height: `${FOOTER_HEIGHT}px`,
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "11px",
      color: "#9ca3af",
    }}
  >
    <div>© 2025 Vettam.AI - Professional Document Editor</div>
  </div>
);

// Individual Page Component
const DocumentPage = ({
  pageNumber,
  totalPages,
  children,
  isActive,
  onClick,
  headerTitle = "Document Title",
}) => (
  <div
    className={`document-page ${isActive ? "active-page" : ""}`}
    onClick={onClick}
    style={{
      width: `${A4_WIDTH_PX}px`,
      minHeight: `${A4_HEIGHT_PX}px`,
      backgroundColor: "white",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      marginBottom: "20px",
      position: "relative",
      border: isActive ? "2px solid #3b82f6" : "1px solid #e5e7eb",
      cursor: "pointer",
      transition: "all 0.2s ease-in-out",
    }}
  >
    <PageHeader
      pageNumber={pageNumber}
      totalPages={totalPages}
      title={headerTitle}
    />

    <div
      className="page-content"
      style={{
        minHeight: `${CONTENT_HEIGHT}px`,
        padding: `${PAGE_MARGIN}px`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>

    <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
  </div>
);

// Enhanced Tiptap Editor
const useAdvancedEditor = (initialContent = "") => {
  const [content, setContent] = useState(
    initialContent || "<p>Start writing your document...</p>"
  );
  const [pages, setPages] = useState([
    {
      id: 1,
      content: initialContent || "<p>Start writing your document...</p>",
    },
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isActive, setIsActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    bulletList: false,
    orderedList: false,
    link: false,
  });
  const [textAlign, setTextAlign] = useState("left");
  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [fontWeight, setFontWeight] = useState("400");
  const [characterCount, setCharacterCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const editorRef = useRef(null);
  const isUpdatingContent = useRef(false);

  // Save cursor position
  const saveCursorPosition = useCallback(() => {
    if (!editorRef.current) return null;

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
    return null;
  }, []);

  // Restore cursor position
  const restoreCursorPosition = useCallback((position) => {
    if (!editorRef.current || position === null) return;

    const selection = window.getSelection();
    const range = document.createRange();

    let currentPos = 0;
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      const nodeLength = node.textContent.length;
      if (currentPos + nodeLength >= position) {
        range.setStart(node, position - currentPos);
        range.setEnd(node, position - currentPos);
        break;
      }
      currentPos += nodeLength;
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  // Calculate if content exceeds page height
  const checkPageOverflow = useCallback((element) => {
    if (!element) return false;
    const contentHeight = element.scrollHeight;
    return contentHeight > CONTENT_HEIGHT;
  }, []);

  // Auto-paginate content
  const autoPaginate = useCallback(() => {
    if (!editorRef.current || isUpdatingContent.current) return;

    const tempDiv = document.createElement("div");
    tempDiv.style.width = `${A4_WIDTH_PX - PAGE_MARGIN * 2}px`;
    tempDiv.style.fontSize = `${fontSize}px`;
    tempDiv.style.fontFamily = fontFamily;
    tempDiv.style.fontWeight = fontWeight;
    tempDiv.style.lineHeight = "1.6";
    tempDiv.style.position = "absolute";
    tempDiv.style.visibility = "hidden";
    tempDiv.innerHTML = content;
    document.body.appendChild(tempDiv);

    const totalHeight = tempDiv.scrollHeight;
    const pagesNeeded = Math.ceil(totalHeight / CONTENT_HEIGHT);

    document.body.removeChild(tempDiv);

    if (pagesNeeded !== pages.length) {
      const newPages = Array.from({ length: pagesNeeded }, (_, index) => ({
        id: index + 1,
        content: index === 0 ? content : "",
      }));
      setPages(newPages);
    }
  }, [content, fontSize, fontFamily, fontWeight, pages.length]);

  // Update content and trigger auto-pagination
  const updateContent = useCallback(() => {
    if (!editorRef.current || isUpdatingContent.current) return;

    const cursorPosition = saveCursorPosition();
    isUpdatingContent.current = true;

    const newContent = editorRef.current.innerHTML;
    const textContent = editorRef.current.innerText || "";

    setContent(newContent);
    setCharacterCount(textContent.length);
    setWordCount(
      textContent
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length
    );

    // Auto-paginate
    setTimeout(() => {
      autoPaginate();
      isUpdatingContent.current = false;
      if (cursorPosition !== null) {
        setTimeout(() => restoreCursorPosition(cursorPosition), 50);
      }
    }, 100);
  }, [autoPaginate, saveCursorPosition, restoreCursorPosition]);

  // Initialize content when editor ref is available
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  // Format commands
  const toggleFormat = (format) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const cursorPosition = saveCursorPosition();

    try {
      switch (format) {
        case "bold":
          document.execCommand("bold", false, null);
          break;
        case "italic":
          document.execCommand("italic", false, null);
          break;
        case "underline":
          document.execCommand("underline", false, null);
          break;
        case "bulletList":
          document.execCommand("insertUnorderedList", false, null);
          break;
        case "orderedList":
          document.execCommand("insertOrderedList", false, null);
          break;
      }

      setIsActive((prev) => ({ ...prev, [format]: !prev[format] }));
      setTimeout(() => {
        updateContent();
        if (cursorPosition !== null) {
          setTimeout(() => restoreCursorPosition(cursorPosition), 50);
        }
      }, 0);
    } catch (e) {
      console.warn("Command execution failed:", e);
    }
  };

  const handleTextAlign = (align) => {
    if (!editorRef.current) return;
    const cursorPosition = saveCursorPosition();

    setTextAlign(align);
    editorRef.current.style.textAlign = align;

    setTimeout(() => {
      updateContent();
      if (cursorPosition !== null) {
        setTimeout(() => restoreCursorPosition(cursorPosition), 50);
      }
    }, 0);
  };

  const addLink = (url) => {
    if (url && editorRef.current) {
      editorRef.current.focus();
      const cursorPosition = saveCursorPosition();

      try {
        document.execCommand("createLink", false, url);
        setIsActive((prev) => ({ ...prev, link: true }));
        setTimeout(() => {
          updateContent();
          if (cursorPosition !== null) {
            setTimeout(() => restoreCursorPosition(cursorPosition), 50);
          }
        }, 0);
      } catch (e) {
        console.warn("Link creation failed:", e);
      }
    }
  };

  const removeLink = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      const cursorPosition = saveCursorPosition();

      try {
        document.execCommand("unlink");
        setIsActive((prev) => ({ ...prev, link: false }));
        setTimeout(() => {
          updateContent();
          if (cursorPosition !== null) {
            setTimeout(() => restoreCursorPosition(cursorPosition), 50);
          }
        }, 0);
      } catch (e) {
        console.warn("Link removal failed:", e);
      }
    }
  };

  const insertPageBreak = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      const cursorPosition = saveCursorPosition();

      // Page Break
      const pageBreakHtml = `
        <div class="manual-page-break" 
             style="page-break-before: always; 
                    height: 20px; 
                    border-top: 2px dashed #3b82f6; 
                    border-bottom: 1px solid #e5e7eb;
                    margin: 30px 0; 
                    text-align: center; 
                    color: #3b82f6; 
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 500;">
          <span style="background: white; 
                       padding: 4px 12px; 
                       border: 1px solid #3b82f6; 
                       border-radius: 4px;
                       color: #3b82f6;">
            📄 Page Break
          </span>
        </div>
        <p><br></p>
      `;

      try {
        document.execCommand("insertHTML", false, pageBreakHtml);

        setTimeout(() => {
          updateContent();
          if (cursorPosition !== null) {
            // Position cursor after the page break
            setTimeout(() => restoreCursorPosition(cursorPosition + 20), 100);
          }
        }, 50);
      } catch (e) {
        console.warn("Page break insertion failed:", e);
        // Fallback method
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const pageBreakElement = document.createElement("div");
        pageBreakElement.innerHTML = pageBreakHtml;
        range.insertNode(pageBreakElement.firstChild);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        updateContent();
      }
    }
  };

  const chain = () => ({
    focus: () => ({
      toggleBold: () => ({ run: () => toggleFormat("bold") }),
      toggleItalic: () => ({ run: () => toggleFormat("italic") }),
      toggleUnderline: () => ({ run: () => toggleFormat("underline") }),
      toggleBulletList: () => ({ run: () => toggleFormat("bulletList") }),
      toggleOrderedList: () => ({ run: () => toggleFormat("orderedList") }),
      setTextAlign: (align) => ({ run: () => handleTextAlign(align) }),
      setLink: (attrs) => ({ run: () => addLink(attrs.href) }),
      unsetLink: () => ({ run: () => removeLink() }),
      insertPageBreak: () => ({ run: () => insertPageBreak() }),
    }),
  });

  return {
    chain,
    isActive: (format) => isActive[format] || false,
    getHTML: () => content,
    setContent: (newContent) => {
      setContent(newContent);
      if (editorRef.current && !isUpdatingContent.current) {
        isUpdatingContent.current = true;
        editorRef.current.innerHTML = newContent;
        setTimeout(() => {
          isUpdatingContent.current = false;
          updateContent();
        }, 50);
      }
    },
    textAlign,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    fontWeight,
    setFontWeight,
    pages,
    currentPage,
    setCurrentPage,
    characterCount,
    wordCount,
    editorRef,
    updateContent,
    insertPageBreak,
  };
};

// Main App Component
export default function PaginatedDocumentEditor() {
  const [documentTitle, setDocumentTitle] = useState("Professional Document");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const editor = useAdvancedEditor();

  // Print functionality
  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
      setShowPrintPreview(false);
    }, 100);
  };

  // Export to PDF (simulated)
  const handleExportPDF = async () => {
    // In a real implementation, you would use libraries like jsPDF or Puppeteer
    alert(
      "PDF export functionality would be implemented with jsPDF or similar library"
    );
  };

  // Save document (simulated)
  const handleSave = () => {
    const documentData = {
      title: documentTitle,
      content: editor.getHTML(),
      pages: editor.pages,
      metadata: {
        characterCount: editor.characterCount,
        wordCount: editor.wordCount,
        pageCount: editor.pages.length,
        lastModified: new Date().toISOString(),
      },
    };

    console.log("Saving document:", documentData);
    alert("Document saved successfully!");
  };

  const handleAddLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleRemoveLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content,
          .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .document-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            page-break-after: always;
          }
          .document-page:last-child {
            page-break-after: avoid;
          }
          .page-header,
          .page-footer {
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }

        .document-page {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .document-page:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .active-page {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2),
            0 4px 6px -2px rgba(59, 130, 246, 0.1);
        }

        .manual-page-break {
          display: flex !important;
          align-items: center;
          justify-content: center;
          height: 20px;
          border-top: 2px dashed #3b82f6;
          border-bottom: 1px solid #e5e7eb;
          margin: 30px 0;
          background: #f8fafc;
          color: #3b82f6;
          font-size: 12px;
          font-weight: 500;
        }

        .manual-page-break span {
          background: white;
          padding: 4px 12px;
          border: 1px solid #3b82f6;
          border-radius: 4px;
          color: #3b82f6;
        }

        @media print {
          .manual-page-break {
            display: block !important;
            page-break-before: always;
            height: 0 !important;
            border: none !important;
            margin: 0 !important;
            background: transparent !important;
            visibility: hidden;
          }

          .manual-page-break span {
            display: none !important;
          }
        }
      `}</style>

      <div
        className={`flex h-screen bg-gray-100 ${
          showPrintPreview ? "print-content" : ""
        }`}
      >
        {/* Left Sidebar */}
        <div className="w-48 bg-purple-900 text-white flex flex-col no-print">
          {/* Logo */}
          <div className="flex items-center p-4 border-b border-purple-800">
            <div className="w-6 h-6 bg-white rounded mr-2 flex items-center justify-center">
              <div className="w-3 h-3 bg-purple-900 rounded"></div>
            </div>
            <span className="font-medium text-sm">Vettam.AI</span>
            <Menu size={16} className="ml-auto" />
          </div>

          {/* New Document Button */}
          <div className="p-4">
            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded text-sm font-medium">
              New Document
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4">
            <div className="space-y-1">
              <button className="flex items-center w-full text-left py-2 px-2 rounded text-sm hover:bg-purple-800">
                <FileText size={16} className="mr-3" />
                Documents
              </button>
              <button className="flex items-center w-full text-left py-2 px-2 rounded text-sm hover:bg-purple-800 bg-purple-800">
                <Edit3 size={16} className="mr-3" />
                Editor
              </button>
              <button className="flex items-center w-full text-left py-2 px-2 rounded text-sm hover:bg-purple-800">
                <Bookmark size={16} className="mr-3" />
                Templates
              </button>
            </div>

            {/* Document Stats */}
            <div className="mt-6">
              <div className="text-xs text-purple-300 mb-2 px-2">
                Document Stats
              </div>
              <div className="space-y-1 text-xs text-purple-200 px-2">
                <div>Pages: {editor.pages.length}</div>
                <div>Words: {editor.wordCount}</div>
                <div>Characters: {editor.characterCount}</div>
              </div>
            </div>
          </nav>

          {/* Bottom User Section */}
          <div className="p-4 border-t border-purple-800">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-700 rounded-full mr-2 flex items-center justify-center text-xs font-medium">
                VP
              </div>
              <span className="text-sm">Vatsal Parmar</span>
              <Settings size={16} className="ml-auto text-purple-300" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between no-print">
            <div className="flex items-center">
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="font-medium text-gray-800 mr-2 border-none outline-none bg-transparent"
                placeholder="Document Title"
              />
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-500">Auto-saved</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSave}
                className="p-2 hover:bg-gray-100 rounded"
                title="Save"
              >
                <Save size={16} className="text-gray-600" />
              </button>
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-gray-100 rounded"
                title="Print"
              >
                <Printer size={16} className="text-gray-600" />
              </button>
              <button
                onClick={handleExportPDF}
                className="p-2 hover:bg-gray-100 rounded"
                title="Export PDF"
              >
                <Download size={16} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded" title="Share">
                <Share2 size={16} className="text-gray-600" />
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded"
                title="More options"
              >
                <MoreVertical size={16} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Enhanced Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 no-print">
            <div className="flex items-center space-x-1 flex-wrap">
              {/* Font Controls */}
              <select
                value={editor.fontFamily}
                onChange={(e) => {
                  editor.setFontFamily(e.target.value);
                  if (editor.editorRef.current) {
                    editor.editorRef.current.style.fontFamily = e.target.value;
                  }
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-700 hover:border-gray-400 focus:border-blue-500 focus:outline-none"
              >
                <option value="Times New Roman">Times New Roman</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
              </select>

              <select
                value={editor.fontSize}
                onChange={(e) => {
                  editor.setFontSize(e.target.value);
                  if (editor.editorRef.current) {
                    editor.editorRef.current.style.fontSize = `${e.target.value}px`;
                  }
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-700 ml-2 hover:border-gray-400 focus:border-blue-500 focus:outline-none"
              >
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
                <option value="14">14</option>
                <option value="16">16</option>
                <option value="18">18</option>
                <option value="24">24</option>
                <option value="36">36</option>
              </select>

              {/* Formatting Buttons */}
              <div className="flex items-center ml-4 border-l border-gray-300 pl-4">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded hover:bg-gray-100 ${
                    editor.isActive("bold")
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600"
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={16} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded hover:bg-gray-100 ml-1 ${
                    editor.isActive("italic")
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600"
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={16} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={`p-1.5 rounded hover:bg-gray-100 ml-1 ${
                    editor.isActive("underline")
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600"
                  }`}
                  title="Underline (Ctrl+U)"
                >
                  <Underline size={16} />
                </button>
              </div>

              {/* Lists */}
              <div className="flex items-center ml-4 border-l border-gray-300 pl-4">
                <button
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                  className={`p-1.5 rounded hover:bg-gray-100 ${
                    editor.isActive("bulletList")
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600"
                  }`}
                  title="Bullet List"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                  className={`p-1.5 rounded hover:bg-gray-100 ml-1 ${
                    editor.isActive("orderedList")
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600"
                  }`}
                  title="Numbered List"
                >
                  <ListOrdered size={16} />
                </button>
              </div>

              {/* Alignment */}
              <div className="flex items-center ml-4 border-l border-gray-300 pl-4">
                <button
                  onClick={() =>
                    editor.chain().focus().setTextAlign("left").run()
                  }
                  className={`p-1.5 rounded hover:bg-gray-100 ${
                    editor.textAlign === "left"
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600"
                  }`}
                  title="Align Left"
                >
                  <AlignLeft size={16} />
                </button>
                <button
                  onClick={() =>
                    editor.chain().focus().setTextAlign("center").run()
                  }
                  className={`p-1.5 rounded hover:bg-gray-100 ml-1 ${
                    editor.textAlign === "center"
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600"
                  }`}
                  title="Align Center"
                >
                  <AlignCenter size={16} />
                </button>
                <button
                  onClick={() =>
                    editor.chain().focus().setTextAlign("right").run()
                  }
                  className={`p-1.5 rounded hover:bg-gray-100 ml-1 ${
                    editor.textAlign === "right"
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600"
                  }`}
                  title="Align Right"
                >
                  <AlignRight size={16} />
                </button>
              </div>

              {/* Page Break */}
              <div className="flex items-center ml-4 border-l border-gray-300 pl-4">
                <button
                  onClick={() => editor.chain().focus().insertPageBreak().run()}
                  className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 rounded text-blue-700 font-medium border border-blue-200 transition-colors"
                  title="Insert Page Break (Forces content to start on next page when printing)"
                >
                  📄 Page Break
                </button>
              </div>
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Document Pages */}
            <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">
              <div className="max-w-5xl mx-auto">
                {editor.pages.map((page, index) => (
                  <DocumentPage
                    key={page.id}
                    pageNumber={page.id}
                    totalPages={editor.pages.length}
                    isActive={editor.currentPage === page.id}
                    onClick={() => editor.setCurrentPage(page.id)}
                    headerTitle={documentTitle}
                  >
                    {index === editor.currentPage - 1 ? (
                      <div
                        ref={editor.editorRef}
                        contentEditable="true"
                        onInput={editor.updateContent}
                        onKeyDown={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            switch (e.key) {
                              case "b":
                                e.preventDefault();
                                editor.chain().focus().toggleBold().run();
                                break;
                              case "i":
                                e.preventDefault();
                                editor.chain().focus().toggleItalic().run();
                                break;
                              case "u":
                                e.preventDefault();
                                editor.chain().focus().toggleUnderline().run();
                                break;
                              default:
                                break;
                            }
                          }
                        }}
                        className="w-full min-h-full outline-none"
                        style={{
                          fontFamily: editor.fontFamily,
                          fontSize: `${editor.fontSize}px`,
                          fontWeight: editor.fontWeight,
                          textAlign: editor.textAlign,
                          lineHeight: "1.6",
                        }}
                        suppressContentEditableWarning={true}
                      />
                    ) : (
                      <div
                        className="w-full min-h-full text-gray-400 cursor-pointer"
                        style={{
                          fontFamily: editor.fontFamily,
                          fontSize: `${editor.fontSize}px`,
                          lineHeight: "1.6",
                        }}
                        onClick={() => editor.setCurrentPage(page.id)}
                      >
                        <p>Click to edit page {page.id}...</p>
                        <p>
                          This page contains additional content that would flow
                          from the previous pages.
                        </p>
                      </div>
                    )}
                  </DocumentPage>
                ))}
              </div>
            </div>

            {/* Right Sidebar - Page Navigation */}
            <div className="w-64 bg-white border-l border-gray-200 p-4 no-print">
              <div className="flex items-center justify-between mb-4">
                <button className="font-medium text-sm text-blue-600 border-b border-blue-600">
                  Pages
                </button>
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="font-medium text-sm text-gray-500 hover:text-gray-700"
                >
                  {isPreviewMode ? "Edit" : "Preview"}
                </button>
              </div>

              {/* Page Thumbnails */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {editor.pages.map((page, index) => (
                  <div
                    key={page.id}
                    className={`bg-gray-50 border rounded p-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                      editor.currentPage === page.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                    onClick={() => editor.setCurrentPage(page.id)}
                  >
                    <div className="text-center mb-2">
                      <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        A4
                      </span>
                    </div>

                    {/* Thumbnail Preview */}
                    <div className="bg-white border rounded h-32 mb-2 p-2 overflow-hidden">
                      <div className="text-xs text-gray-600 leading-tight">
                        {/* Header simulation */}
                        <div className="border-b pb-1 mb-1 text-center text-gray-400">
                          {documentTitle} - Page {page.id}
                        </div>

                        {/* Content preview */}
                        <div
                          className="line-clamp-4"
                          dangerouslySetInnerHTML={{
                            __html:
                              index === 0
                                ? editor.getHTML().slice(0, 200) +
                                  (editor.getHTML().length > 200 ? "..." : "")
                                : `<p>Page ${page.id} content continues from previous pages...</p>`,
                          }}
                        />

                        {/* Footer simulation */}
                        <div className="border-t pt-1 mt-1 text-center text-gray-400 text-xs">
                          © 2025 Vettam.AI
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-xs text-gray-500">
                      Page {page.id}
                      {editor.currentPage === page.id && (
                        <span className="text-blue-600 font-medium">
                          {" "}
                          (Active)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Document Statistics */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-sm text-gray-800 mb-2">
                  Document Info
                </h3>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Pages:</span>
                    <span className="font-medium">{editor.pages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Words:</span>
                    <span className="font-medium">{editor.wordCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Characters:</span>
                    <span className="font-medium">{editor.characterCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reading Time:</span>
                    <span className="font-medium">
                      {Math.ceil(editor.wordCount / 200)} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-sm text-gray-800 mb-2">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      editor.chain().focus().insertPageBreak().run()
                    }
                    className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded transition-colors border border-blue-200"
                  >
                    📄 Insert Page Break
                  </button>
                  <button
                    onClick={handleAddLink}
                    className="w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded transition-colors"
                  >
                    Add Hyperlink
                  </button>
                  <button
                    onClick={handlePrint}
                    className="w-full text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-3 rounded transition-colors"
                  >
                    Print Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-5/6 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Print Preview</h2>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="print-preview-content">
              {editor.pages.map((page, index) => (
                <DocumentPage
                  key={page.id}
                  pageNumber={page.id}
                  totalPages={editor.pages.length}
                  headerTitle={documentTitle}
                  isActive={false}
                  onClick={() => {}}
                >
                  <div
                    className="w-full min-h-full"
                    style={{
                      fontFamily: editor.fontFamily,
                      fontSize: `${editor.fontSize}px`,
                      fontWeight: editor.fontWeight,
                      textAlign: editor.textAlign,
                      lineHeight: "1.6",
                    }}
                    dangerouslySetInnerHTML={{
                      __html:
                        index === 0
                          ? editor.getHTML()
                          : `<p>Page ${page.id} content would continue from previous pages based on content overflow...</p>`,
                    }}
                  />
                </DocumentPage>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors"
          title="Print Document"
        >
          <Printer size={20} />
        </button>
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-48 right-0 bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-600 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>
              Page {editor.currentPage} of {editor.pages.length}
            </span>
            <span>•</span>
            <span>{editor.wordCount} words</span>
            <span>•</span>
            <span>{editor.characterCount} characters</span>
            <span>•</span>
            <span>
              Font: {editor.fontFamily} {editor.fontSize}px
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Auto-saved</span>
          </div>
        </div>
      </div>
    </>
  );
}
