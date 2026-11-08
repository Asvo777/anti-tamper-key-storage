`timescale 1ns / 1ps

module tb_secure_key_cell;

    // Inputs
    reg clk;
    reg rst_n;
    reg tamper_line_n;
    reg key_data_in;
    reg write_enable;

    // Outputs
    wire secure_key_out;

    // Instantiate the Unit Under Test (UUT)
    secure_key_cell uut (
        .clk(clk),
        .rst_n(rst_n),
        .tamper_line_n(tamper_line_n),
        .key_data_in(key_data_in),
        .write_enable(write_enable),
        .secure_key_out(secure_key_out)
    );

    // Generate 100MHz clock signal (10ns period)
    always #5 clk = ~clk;

    initial begin
        // Initialize Inputs
        clk = 0;
        rst_n = 0;
        tamper_line_n = 1; // System starts physically secure
        key_data_in = 0;
        write_enable = 0;

        // Hold reset state for 20ns
        #20;
        rst_n = 1;
        #10;

        // Scenario 1: Write a secure key '1' into the cell
        $display("[TIME %0t] Writing Key Data = 1 to cell...", $time);
        key_data_in = 1'b1;
        write_enable = 1'b1;
        #10;
        write_enable = 1'b0; // Lock the register
        #10;

        // Scenario 2: Verify the key is securely retained
        if (secure_key_out === 1'b1) 
            $display("[TIME %0t] SUCCESS: Key safely stored in hardware.", $time);
        else 
            $display("[TIME %0t] ERROR: Key storage failed.", $time);
        #20;

        // Scenario 3: CATASTROPHIC TAMPER EVENT (Simulate the wire being cut mid-cycle)
        $display("[TIME %0t] !!! ALERT !!! Simulating physical tamper event loop breach...", $time);
        tamper_line_n = 1'b0; // Trigger the tamper line down to 0V asynchronously
        
        // Check the output immediately before the next clock tick
        #2;
        if (secure_key_out === 1'b0)
            $display("[TIME %0t] SUCCESS: Key instantly destroyed in silicon asynchronously!", $time);
        else
            $display("[TIME %0t] FAILURE: Key was not sanitized quickly enough.", $time);

        #20;
        $display("Simulation complete.");
        $finish;
    end

endmodule