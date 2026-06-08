from pathlib import Path
from langchain_unstructured import UnstructuredLoader

def parse_pdf(pdf_path):
    loader = UnstructuredLoader(
        str(pdf_path),
        strategy="hi_res",
        chunking_strategy="by_title",  
        max_characters=1000,
        overlap=150,
        multipage_sections=True,       
    )
    docs = loader.load()

   
    filtered = [
        d for d in docs
        if len(d.page_content.strip()) >= 50
        and "......" not in d.page_content
    ]
    print(f"Parsed {len(filtered)} chunks (from hi_res + by_title)")
    return filtered