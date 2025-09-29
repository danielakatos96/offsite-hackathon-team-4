#!/usr/bin/env python3
"""
Data Vectorization Script using SentenceTransformer

This script transforms JSON documents into vectorized embeddings using
sentence-transformers model.
"""

import json
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Union


class DataVectorizer:
    """
    A class to handle data vectorization using SentenceTransformer.
    """
    
    def __init__(self, model_name: str = 'sentence-transformers/all-MiniLM-L6-v2'):
        """
        Initialize the DataVectorizer with a SentenceTransformer model.
        
        Args:
            model_name: Name of the SentenceTransformer model to use
        """
        self.model = SentenceTransformer(model_name)
        self.embeddings = None
        self.raw_data = None
    
    def load_json_data(self, json_file_path: str) -> None:
        """
        Load data from a JSON file.
        
        Args:
            json_file_path: Path to the JSON file
        """
        with open(json_file_path, 'r', encoding='utf-8') as file:
            self.raw_data = json.load(file)
        print(f"Loaded data from {json_file_path}")
    
    def load_json_string(self, json_string: str) -> None:
        """
        Load data from a JSON string.
        
        Args:
            json_string: JSON data as a string
        """
        self.raw_data = json.loads(json_string)
        print("Loaded data from JSON string")
    
    def extract_sentences(self, text_field: str = 'text') -> List[str]:
        """
        Extract sentences from the loaded data.
        
        Args:
            text_field: Name of the field containing text data
            
        Returns:
            List of sentences to vectorize
        """
        if self.raw_data is None:
            raise ValueError("No data loaded. Load data first.")
        
        sentences = []
        
        # Handle different data structures
        if isinstance(self.raw_data, list):
            # List of documents
            for doc in self.raw_data:
                if isinstance(doc, dict) and text_field in doc:
                    sentences.append(doc[text_field])
                elif isinstance(doc, str):
                    sentences.append(doc)
        elif isinstance(self.raw_data, dict):
            # Single document or dictionary
            if text_field in self.raw_data:
                if isinstance(self.raw_data[text_field], list):
                    sentences.extend(self.raw_data[text_field])
                else:
                    sentences.append(self.raw_data[text_field])
        
        return sentences
    
    def vectorize_sentences(self, sentences: List[str]) -> np.ndarray:
        """
        Vectorize sentences using SentenceTransformer.
        
        Args:
            sentences: List of sentences to vectorize
            
        Returns:
            Vectorized embeddings as numpy array
        """
        if not sentences:
            raise ValueError("No sentences provided for vectorization")
        
        print(f"Vectorizing {len(sentences)} sentences...")
        self.embeddings = self.model.encode(sentences)
        print(f"Generated embeddings with shape: {self.embeddings.shape}")
        
        return self.embeddings
    
    def process_json_data(self, text_field: str = 'text') -> np.ndarray:
        """
        Process JSON data and return vectorized embeddings.
        
        Args:
            text_field: Name of the field containing text data
            
        Returns:
            Vectorized embeddings as numpy array
        """
        sentences = self.extract_sentences(text_field)
        return self.vectorize_sentences(sentences)
    
    def save_embeddings(self, output_path: str) -> None:
        """
        Save embeddings to file.
        
        Args:
            output_path: Path to save the embeddings
        """
        if self.embeddings is not None:
            np.save(output_path, self.embeddings)
            print(f"Embeddings saved to {output_path}")
        else:
            print("No embeddings to save. Process data first.")
    
    def get_embeddings(self) -> np.ndarray:
        """
        Get the current embeddings.
        
        Returns:
            Current embeddings as numpy array
        """
        if self.embeddings is not None:
            return self.embeddings
        else:
            raise ValueError("No embeddings available. Process data first.")


def main():
    """
    Main function to demonstrate usage.
    """
    # Initialize vectorizer
    vectorizer = DataVectorizer()
    
    # Load and process JSON data
    try:
        vectorizer.load_json_data('sample_data.json')
        embeddings = vectorizer.process_json_data('text')
        
        print(f"Embeddings shape: {embeddings.shape}")
        print(f"First embedding (first 5 dimensions): {embeddings[0][:5]}")
        
        # Save embeddings
        vectorizer.save_embeddings('embeddings.npy')
        
    except FileNotFoundError:
        print("sample_data.json not found. Please create the sample data file first.")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
