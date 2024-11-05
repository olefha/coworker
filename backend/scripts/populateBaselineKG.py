from neo4j import GraphDatabase
import re
import os
from dotenv import load_dotenv

load_dotenv()

# Load environment variables
neo4j_user = os.getenv("NEO4J_USERNAME")
neo4j_password = os.getenv("NEO4J_PASSWORD")
neo4j_uri = os.getenv("NEO4J_URI")
neo4j_database = os.getenv("NEO4J_BASELINE_DATABASE")


# Define the path to your description file
description_file = 'baseline-kg-description.txt'

# Read the file
with open(description_file, 'r') as file:
    content = file.read()

# Define regex patterns to capture Entities and Relationships
entity_pattern = r'Entity:\s*(\w+)\s*Attributes:\s*((?:-\s*\w+\s*\([^)]+\)\s*\n?)+)'
relationship_pattern = r'Relationship:\s*(\w+)\s+(\w+)\s+(\w+)\s*Description:\s*(.+)'

# Extract Entities
entities = re.findall(entity_pattern, content, re.MULTILINE)

# Extract Relationships
relationships = re.findall(relationship_pattern, content, re.MULTILINE)

# Debugging: Print the number of entities and relationships found
print(f"Found {len(entities)} entities:")
for entity in entities:
    print(f"Entity: {entity[0]}")
    print(f"Attributes:\n{entity[1]}")
    print("----")

print(f"\nFound {len(relationships)} relationships:")
for rel in relationships:
    print(f"Relationship Type: {rel[1]}, From: {rel[0]}, To: {rel[2]}, Description: {rel[3]}")
    print("----")

driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password), database=neo4j_database)

def create_entity(tx, entity_name, attributes):
    # Parse attributes into a list of dictionaries
    attrs = []
    for attr_line in attributes.strip().split('\n'):
        match = re.match(r'-\s*(\w+)\s*\(([^)]+)\)', attr_line.strip())
        if match:
            attr_name, attr_type = match.groups()
            attrs.append({'name': attr_name, 'data_type': attr_type})
    
    # Create the Entity node
    tx.run("""
        MERGE (e:Entity { name: $entity_name })
        """, entity_name=entity_name)
    
    # Create Attribute nodes and relationships
    for attr in attrs:
        tx.run("""
            MERGE (a:Attribute { name: $attr_name, data_type: $attr_type })
            MERGE (e:Entity { name: $entity_name })
            MERGE (e)-[:HAS_ATTRIBUTE]->(a)
            """, entity_name=entity_name, attr_name=attr['name'], attr_type=attr['data_type'])

def create_relationship(tx, rel_type, from_entity, to_entity, description):
    # Ensure relationship type is uppercase and underscores
    rel_type_clean = re.sub(r'\s+', '_', rel_type.upper())
    # Create Relationship between Entities with description
    tx.run(f"""
        MATCH (a:Entity {{ name: $from_entity }}), (b:Entity {{ name: $to_entity }})
        MERGE (a)-[:{rel_type_clean} {{ description: $description }}]->(b)
        """, from_entity=from_entity, to_entity=to_entity, description=description)

with driver.session() as session:
    # Create Entities and Attributes
    for entity in entities:
        name, attrs = entity
        print(f"Creating Entity: {name}")
        session.execute_write(create_entity, name, attrs)
    
    # Create Relationships
    for rel in relationships:
        from_entity, rel_type, to_entity, description = rel
        print(f"Creating Relationship: {from_entity} {rel_type} {to_entity}")
        session.execute_write(create_relationship, rel_type, from_entity, to_entity, description)

driver.close()
print("Knowledge Graph population complete.")
