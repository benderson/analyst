#!/bin/bash

# Script to test AI SDK v5 mode with the research panel

echo "Testing AI SDK v5 Mode"
echo "====================="

# Check if we're in the analyst directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the analyst directory"
    exit 1
fi

# Function to test different modes
test_mode() {
    local mode=$1
    local description=$2
    
    echo ""
    echo "Testing: $description"
    echo "------------------------"
    
    case $mode in
        "v4")
            echo "Running in v4 mode (default)"
            unset AI_SDK_V5_MODE
            unset AI_SDK_V5_ONLY
            ;;
        "dual")
            echo "Running in dual mode (v4 + v5)"
            export AI_SDK_V5_MODE=true
            unset AI_SDK_V5_ONLY
            ;;
        "v5")
            echo "Running in v5-only mode"
            unset AI_SDK_V5_MODE
            export AI_SDK_V5_ONLY=true
            ;;
    esac
    
    echo "Environment:"
    echo "  AI_SDK_V5_MODE=${AI_SDK_V5_MODE:-false}"
    echo "  AI_SDK_V5_ONLY=${AI_SDK_V5_ONLY:-false}"
    echo ""
    echo "Starting the dev server..."
    echo "Navigate to http://localhost:3000/research to test"
    echo "Press Ctrl+C to stop and test the next mode"
    echo ""
    
    # Start the dev server
    pnpm dev
}

# Interactive mode selection
echo "Select test mode:"
echo "1) v4 mode (default, current frontend)"
echo "2) Dual mode (v4 + v5 events)"
echo "3) v5-only mode (future)"
echo -n "Enter choice [1-3]: "
read choice

case $choice in
    1) test_mode "v4" "v4 Mode (Default)" ;;
    2) test_mode "dual" "Dual Mode (v4 + v5)" ;;
    3) test_mode "v5" "v5-Only Mode" ;;
    *) echo "Invalid choice"; exit 1 ;;
esac