#!/usr/bin/env python3
"""
Flask Server for Document Search

A simple web server that provides a search endpoint for querying
vectorized documents using SentenceTransformer embeddings.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from search import DocumentSearcher

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global searcher instance
searcher = None

def initialize_searcher():
    """Initialize the document searcher with default files."""
    global searcher
    try:
        searcher = DocumentSearcher()
        
        # Check if default files exist
        embeddings_path = 'embeddings.npy'
        data_path = 'data.json'
        
        if not os.path.exists(embeddings_path):
            raise FileNotFoundError(f"Embeddings file not found: {embeddings_path}")
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Data file not found: {data_path}")
        
        # Load embeddings and data
        searcher.load_embeddings(embeddings_path)
        searcher.load_document_data(data_path)
        
        print("Document searcher initialized successfully!")
        return True
        
    except Exception as e:
        print(f"Error initializing searcher: {e}")
        return False

@app.route('/')
def home():
    """Home endpoint with API information."""
    return jsonify({
        "message": "Document Search API",
        "version": "1.0",
        "endpoints": {
            "/search": "POST - Search documents with query",
            "/health": "GET - Check server health"
        },
        "usage": {
            "search": {
                "method": "POST",
                "url": "/search",
                "body": {
                    "query": "Your search query here",
                    "top_k": 5  # Optional, default is 5
                }
            }
        }
    })

@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "searcher_initialized": searcher is not None
    })

@app.route('/search', methods=['POST'])
def search_documents():
    """
    Search endpoint that accepts POST requests with search queries.
    
    Expected JSON body:
    {
        "query": "search query string",
        "top_k": 5  // optional, default is 5
    }
    """
    global searcher
    
    if searcher is None:
        return jsonify({
            "error": "Document searcher not initialized"
        }), 500
    
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                "error": "No JSON data provided"
            }), 400
        
        # Extract query and top_k
        query = data.get('query')
        if not query:
            return jsonify({
                "error": "No 'query' field provided in request body"
            }), 400
        
        top_k = data.get('top_k', 5)  # Default to 5 if not provided
        
        # Validate top_k
        if not isinstance(top_k, int) or top_k < 1:
            return jsonify({
                "error": "'top_k' must be a positive integer"
            }), 400
        
        # Perform search
        results = searcher.search(query, top_k)
        
        # Format results for JSON response
        formatted_results = []
        for doc_id, score, doc_data in results:
            result_item = {
                "document_id": doc_id,
                "similarity_score": float(score),
                "title": doc_data.get('title', 'N/A') if doc_data else 'N/A',
                "category": doc_data.get('category', 'N/A') if doc_data else 'N/A',
                "author": doc_data.get('author', 'N/A') if doc_data else 'N/A',
                "text_preview": doc_data.get('text', 'N/A')[:200] + "..." if doc_data and doc_data.get('text') else 'N/A',
                "date": doc_data.get('date', 'N/A') if doc_data else 'N/A',
                "tags": doc_data.get('tags', []) if doc_data else []
            }
            formatted_results.append(result_item)
        
        return jsonify({
            "query": query,
            "top_k": top_k,
            "total_results": len(formatted_results),
            "results": formatted_results
        })
        
    except Exception as e:
        return jsonify({
            "error": f"Search failed: {str(e)}"
        }), 500

@app.route('/search', methods=['GET'])
def search_get():
    """GET endpoint for search (for testing purposes)."""
    return jsonify({
        "message": "Use POST method for search",
        "example": {
            "method": "POST",
            "url": "/search",
            "body": {
                "query": "artificial intelligence",
                "top_k": 3
            }
        }
    })

if __name__ == '__main__':
    print("Starting Document Search Server...")
    
    # Initialize the searcher
    if not initialize_searcher():
        print("Failed to initialize searcher. Please check your files.")
        exit(1)
    
    print("Server ready! Available endpoints:")
    print("  GET  / - API information")
    print("  GET  /health - Health check")
    print("  POST /search - Search documents")
    print("  GET  /search - Search usage info")
    print("\nExample usage:")
    print('curl -X POST http://localhost:5080/search \\')
    print('  -H "Content-Type: application/json" \\')
    print('  -d \'{"query": "artificial intelligence", "top_k": 3}\'')
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=5080, debug=True)
