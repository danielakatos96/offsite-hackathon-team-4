#!/usr/bin/env python3
"""
Search Script for Vectorized Documents

This script takes a query string, vectorizes it using the same SentenceTransformer model,
and finds the best matching documents using cosine similarity.
"""

import json
import numpy as np
import argparse
import sys
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple


class DocumentSearcher:
    """
    A class to search through vectorized documents using cosine similarity.
    """
    
    def __init__(self, model_name: str = 'sentence-transformers/all-MiniLM-L6-v2'):
        """
        Initialize the DocumentSearcher with a SentenceTransformer model.
        
        Args:
            model_name: Name of the SentenceTransformer model to use
        """
        self.model = SentenceTransformer(model_name)
        self.embeddings = None
        self.document_data = None
        self.document_ids = None
    
    def load_embeddings(self, embeddings_path: str) -> None:
        """
        Load pre-computed embeddings from file.
        
        Args:
            embeddings_path: Path to the embeddings .npy file
        """
        self.embeddings = np.load(embeddings_path)
        print(f"Loaded embeddings with shape: {self.embeddings.shape}")
    
    def load_document_data(self, json_path: str) -> None:
        """
        Load document data from JSON file to get IDs and metadata.
        
        Args:
            json_path: Path to the JSON file containing document data
        """
        with open(json_path, 'r', encoding='utf-8') as file:
            self.document_data = json.load(file)
        
        # Extract document IDs and create mapping
        if 'documents' in self.document_data:
            self.document_ids = [doc['id'] for doc in self.document_data['documents']]
            print(f"Loaded {len(self.document_ids)} documents with IDs: {self.document_ids}")
        else:
            print("Warning: No 'documents' key found in JSON data")
    
    def vectorize_query(self, query: str) -> np.ndarray:
        """
        Vectorize a query string using the same model.
        
        Args:
            query: Query string to vectorize
            
        Returns:
            Vectorized query as numpy array
        """
        print(f"Vectorizing query: '{query}'")
        query_embedding = self.model.encode([query])
        print(f"Query embedding shape: {query_embedding.shape}")
        return query_embedding
    
    def find_similar_documents(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Tuple[int, float, Dict]]:
        """
        Find the most similar documents using cosine similarity.
        
        Args:
            query_embedding: Vectorized query
            top_k: Number of top matches to return
            
        Returns:
            List of tuples containing (document_id, similarity_score, document_data)
        """
        if self.embeddings is None:
            raise ValueError("No embeddings loaded. Load embeddings first.")
        
        if self.document_data is None:
            raise ValueError("No document data loaded. Load document data first.")
        
        # Calculate cosine similarity
        similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        print(f"Calculated similarities for {len(similarities)} documents")
        
        # Get top-k most similar documents
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            doc_id = self.document_ids[idx]
            similarity_score = similarities[idx]
            
            # Find the document data
            doc_data = None
            for doc in self.document_data['documents']:
                if doc['id'] == doc_id:
                    doc_data = doc
                    break
            
            results.append((doc_id, similarity_score, doc_data))
        
        return results
    
    def search(self, query: str, top_k: int = 5) -> List[Tuple[int, float, Dict]]:
        """
        Complete search pipeline: vectorize query and find similar documents.
        
        Args:
            query: Query string
            top_k: Number of top matches to return
            
        Returns:
            List of tuples containing (document_id, similarity_score, document_data)
        """
        query_embedding = self.vectorize_query(query)
        return self.find_similar_documents(query_embedding, top_k)
    
    def print_results(self, results: List[Tuple[int, float, Dict]]) -> None:
        """
        Print search results in a formatted way.
        
        Args:
            results: List of search results
        """
        print("\n" + "="*80)
        print("SEARCH RESULTS")
        print("="*80)
        
        for i, (doc_id, score, doc_data) in enumerate(results, 1):
            print(f"\n{i}. Document ID: {doc_id}")
            print(f"   Similarity Score: {score:.4f}")
            if doc_data:
                print(f"   Title: {doc_data.get('title', 'N/A')}")
                print(f"   Category: {doc_data.get('category', 'N/A')}")
                print(f"   Author: {doc_data.get('author', 'N/A')}")
                print(f"   Text Preview: {doc_data.get('text', 'N/A')[:200]}...")
            print("-" * 80)


def main():
    """
    Main function to handle command line arguments and run search.
    """
    parser = argparse.ArgumentParser(description='Search through vectorized documents')
    parser.add_argument('query', help='Search query string')
    parser.add_argument('--embeddings', default='embeddings.npy', 
                       help='Path to embeddings file (default: embeddings.npy)')
    parser.add_argument('--data', default='data.json',
                       help='Path to document data JSON file (default: data.json)')
    parser.add_argument('--top-k', type=int, default=5,
                       help='Number of top results to return (default: 5)')
    parser.add_argument('--model', default='sentence-transformers/all-MiniLM-L6-v2',
                       help='SentenceTransformer model name')
    
    args = parser.parse_args()
    
    # Initialize searcher
    searcher = DocumentSearcher(args.model)
    
    try:
        # Load embeddings and document data
        searcher.load_embeddings(args.embeddings)
        searcher.load_document_data(args.data)
        
        # Perform search
        results = searcher.search(args.query, args.top_k)
        
        # Print results
        searcher.print_results(results)
        
        # Return results for programmatic use
        return results
        
    except FileNotFoundError as e:
        print(f"Error: File not found - {e}")
        print("Make sure you have run the data_vectorizer.py script first to generate embeddings.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
